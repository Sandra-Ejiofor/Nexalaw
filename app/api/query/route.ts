import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateResponse } from '@/lib/rag/generator'
import { retrieveRelevantClauses } from '@/lib/rag/embeddings'
import { generateGeneralLegalResponse } from '@/lib/rag/general'
import { logAuditEvent } from '@/lib/audit'
import { ERROR_CODES } from '@/constants/errors'
import type { ApiResponse } from '@/types'

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
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

    const body = await request.json()
    const { userQuery, documentId, sessionId } = body

    if (!userQuery || typeof userQuery !== 'string' || userQuery.trim().length === 0) {
      return NextResponse.json(
        { success: false, data: null, errorCode: 'E007', message: 'Please enter a question.' },
        { status: 400 }
      )
    }

    if (sessionId) {
      const chatSession = await prisma.session.findFirst({
        where: { id: sessionId, userId },
      })
      if (!chatSession) {
        return NextResponse.json(
          { success: false, data: null, errorCode: 'E004', message: 'Session not found.' },
          { status: 404 }
        )
      }
    }

    let response: string
    let confidenceLevel: string
    let retrievedClauseIds: string[] = []

    if (documentId) {
      const document = await prisma.document.findFirst({
        where: { id: documentId, userId },
      })

      if (!document) {
        return NextResponse.json(
          { success: false, data: null, errorCode: 'E004', message: ERROR_CODES.E004 },
          { status: 404 }
        )
      }

      const relevantClauses = await retrieveRelevantClauses(userQuery, documentId)

      if (relevantClauses.length === 0) {
        return NextResponse.json(
          { success: false, data: null, errorCode: 'E004', message: ERROR_CODES.E004 },
          { status: 404 }
        )
      }

      const generatorResult = await generateResponse(userQuery, relevantClauses)
      response = generatorResult.response
      confidenceLevel = generatorResult.confidenceLevel
      retrievedClauseIds = generatorResult.retrievedClauseIds
    } else {
      const userDocs = await prisma.document.findMany({
        where: { userId, processingStatus: 'completed' },
        include: { clauses: true },
        take: 3,
        orderBy: { uploadedAt: 'desc' },
      })

      const allClauses = userDocs.flatMap(d => d.clauses)
      const relevantClauses = await retrieveRelevantClauses(userQuery, allClauses)

      if (relevantClauses.length > 0) {
        const generatorResult = await generateResponse(userQuery, relevantClauses)
        response = generatorResult.response
        confidenceLevel = generatorResult.confidenceLevel
        retrievedClauseIds = generatorResult.retrievedClauseIds
      } else {
        response = generateGeneralLegalResponse(userQuery)
        confidenceLevel = 'medium'
      }
    }

    logAuditEvent({
      userId,
      action: 'document_query',
      timestamp: new Date(),
    })

    if (sessionId) {
      await prisma.queryInteraction.create({
        data: {
          sessionId,
          documentId: documentId ?? null,
          userId,
          userQuery,
          scopeClassification: 'in_scope',
          retrievedClauses: retrievedClauseIds,
          systemResponse: response,
          confidenceLevel: confidenceLevel as 'high' | 'medium' | 'low' | 'unresolved',
          responseAt: new Date(),
        },
      })

      await prisma.session.update({
        where: { id: sessionId },
        data: {
          queryCount: { increment: 1 },
          lastActivityAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: { response, confidenceLevel },
      errorCode: null,
      message: 'Success.',
    })
  } catch (error) {
    console.error('[query] POST error:', error)
    return NextResponse.json(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}
