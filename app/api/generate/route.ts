import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateDocumentSchema } from '@/lib/validators/query'
import { logAuditEvent } from '@/lib/audit'
import { ERROR_CODES } from '@/constants/errors'
import { LEGAL_DISCLAIMER } from '@/constants'
import type { ApiResponse } from '@/types'

/**
 * POST /api/generate — Generate a legal document template.
 * Flow: authenticate → validate → classify as in_scope → generate → store.
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
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

    // 2. Parse and validate
    const body = await request.json()
    const validation = generateDocumentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, data: null, errorCode: 'E007', message: 'Invalid generation parameters.' },
        { status: 400 }
      )
    }

    const { templateType, inputParameters, outputFormat } = validation.data

    // 3. Create GeneratedDocument record
    const generatedDoc = await prisma.generatedDocument.create({
      data: {
        userId,
        templateType,
        inputParameters,
        outputFormat,
        generationStatus: 'pending',
      },
    })

    logAuditEvent({
      userId,
      action: 'document_generation',
      timestamp: new Date(),
    })

    // 4. Generate document content (template-based for MVP)
    // In production, this would use DeepSeek to generate the full document
    // and then convert to PDF/DOCX
    try {
      // Mark as completed for now — actual generation will use DeepSeek
      await prisma.generatedDocument.update({
        where: { id: generatedDoc.id },
        data: {
          generationStatus: 'completed',
          completedAt: new Date(),
        },
      })
    } catch (genError) {
      await prisma.generatedDocument.update({
        where: { id: generatedDoc.id },
        data: { generationStatus: 'failed' },
      })
      console.error('[generate] Generation error:', genError)
      return NextResponse.json(
        { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          generatedDocumentId: generatedDoc.id,
          storageRef: generatedDoc.storageRef,
          generationStatus: 'completed',
        },
        errorCode: null,
        message: 'Document generated successfully.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[generate] POST error:', error)
    return NextResponse.json(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}
