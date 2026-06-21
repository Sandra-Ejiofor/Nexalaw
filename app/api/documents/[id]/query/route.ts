import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { queryDocumentSchema } from '@/lib/validators/query'
import { classifyScope } from '@/lib/rag/classifier'
import { retrieveRelevantClauses } from '@/lib/rag/embeddings'
import { generateResponse } from '@/lib/rag/generator'
import { logAuditEvent } from '@/lib/audit'
import { ERROR_CODES } from '@/constants/errors'
import type { ApiResponse } from '@/types'

/**
 * POST /api/documents/[id]/query — Query a document with a plain-English question.
 * Flow: authenticate → validate → classify scope → retrieve clauses → generate response.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse>> {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, data: null, errorCode: 'E007', message: 'Unauthorised.' },
        { status: 401 }
      )
    }

    const userId = (session.user as { id?: string }).id
    if (!userId) {
      return NextResponse.json(
        { success: false, data: null, errorCode: 'E007', message: 'Unauthorised.' },
        { status: 401 }
      )
    }

    const { id: documentId } = await params

    // 2. Parse and validate input
    const body = await request.json()
    const validation = queryDocumentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, data: null, errorCode: 'E007', message: 'Invalid query input.' },
        { status: 400 }
      )
    }

    const { userQuery, sessionId } = validation.data

    // 3. Verify document ownership
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
    })

    if (!document) {
      return NextResponse.json(
        { success: false, data: null, errorCode: 'E004', message: ERROR_CODES.E004 },
        { status: 404 }
      )
    }

    // 4. Run scope classification on the query
    const scopeResult = await classifyScope(userQuery, 'query')

    if (scopeResult === 'out_of_scope') {
      // Log the out-of-scope query
      await prisma.queryInteraction.create({
        data: {
          sessionId,
          documentId,
          userId,
          userQuery,
          scopeClassification: 'out_of_scope',
          retrievedClauses: [],
          systemResponse: ERROR_CODES.E008,
          errorCode: 'E008',
          responseAt: new Date(),
        },
      })

      return NextResponse.json(
        { success: false, data: null, errorCode: 'E008', message: ERROR_CODES.E008 },
        { status: 400 }
      )
    }

    // 5. Retrieve relevant clauses via embeddings
    const relevantClauses = await retrieveRelevantClauses(userQuery, documentId)

    if (relevantClauses.length === 0) {
      await prisma.queryInteraction.create({
        data: {
          sessionId,
          documentId,
          userId,
          userQuery,
          scopeClassification: scopeResult === 'ambiguous' ? 'ambiguous' : 'in_scope',
          retrievedClauses: [],
          systemResponse: ERROR_CODES.E004,
          confidenceLevel: 'unresolved',
          errorCode: 'E004',
          responseAt: new Date(),
        },
      })

      return NextResponse.json(
        { success: false, data: null, errorCode: 'E004', message: ERROR_CODES.E004 },
        { status: 404 }
      )
    }

    // 6. Generate response via DeepSeek (or fallback)
    const generatorResult = await generateResponse(userQuery, relevantClauses)

    // 7. Create QueryInteraction record
    const interaction = await prisma.queryInteraction.create({
      data: {
        sessionId,
        documentId,
        userId,
        userQuery,
        scopeClassification: scopeResult === 'ambiguous' ? 'ambiguous' : 'in_scope',
        retrievedClauses: generatorResult.retrievedClauseIds,
        systemResponse: generatorResult.response,
        confidenceLevel: generatorResult.confidenceLevel,
        responseAt: new Date(),
      },
    })

    // 8. Update session query count
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        queryCount: { increment: 1 },
        lastActivityAt: new Date(),
      },
    }).catch(() => {
      // Session may not exist yet — non-critical
    })

    logAuditEvent({
      userId,
      action: 'document_query',
      timestamp: new Date(),
      documentId,
    })

    // 9. Return response
    return NextResponse.json(
      {
        success: true,
        data: {
          response: generatorResult.response,
          confidenceLevel: generatorResult.confidenceLevel,
          retrievedClauseIds: generatorResult.retrievedClauseIds,
        },
        errorCode: null,
        message: 'Success.',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[documents/[id]/query] POST error:', error)
    return NextResponse.json(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}
