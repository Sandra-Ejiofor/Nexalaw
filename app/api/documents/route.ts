import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadDocumentSchema, validateExtensionMimeMatch } from '@/lib/validators/document'
import { extractText, processDocument } from '@/lib/rag/extractor'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { sendProcessingCompleteEmail } from '@/lib/email'
import { logAuditEvent } from '@/lib/audit'
import { RETENTION_DAYS } from '@/constants'
import { ERROR_CODES } from '@/constants/errors'
import type { ApiResponse } from '@/types'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
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

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, data: null, errorCode: 'E001', message: ERROR_CODES.E001 },
        { status: 400 }
      )
    }

    const validation = uploadDocumentSchema.safeParse({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    })

    if (!validation.success) {
      const isFormatError = file.type && !['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)
      return NextResponse.json(
        {
          success: false,
          data: null,
          errorCode: isFormatError ? 'E006' : 'E002',
          message: isFormatError ? ERROR_CODES.E006 : ERROR_CODES.E002,
        },
        { status: 400 }
      )
    }

    if (!validateExtensionMimeMatch(file.name, file.type)) {
      return NextResponse.json(
        { success: false, data: null, errorCode: 'E006', message: ERROR_CODES.E006 },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    const storageRef = await uploadToCloudinary(fileBuffer, file.name)

    const extension = file.name.split('.').pop()?.toLowerCase()
    const fileTypeMap: Record<string, 'pdf' | 'txt' | 'docx'> = {
      pdf: 'pdf',
      txt: 'txt',
      docx: 'docx',
    }
    const fileTypeEnum = fileTypeMap[extension ?? ''] ?? 'pdf'

    // Extract text synchronously so the document is immediately queryable
    const extractedText = await extractText(fileBuffer, file.type)

    const document = await prisma.document.create({
      data: {
        userId,
        fileName: file.name,
        fileType: fileTypeEnum,
        fileSize: file.size,
        storageRef,
        scopeStatus: 'unclassified',
        processingStatus: 'processing',
        retentionExpiry: new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000),
        extractedText,
      },
    })

    logAuditEvent({
      userId,
      action: 'document_upload',
      timestamp: new Date(),
      documentId: document.id,
    })

    // Run full clause extraction + risk flagging asynchronously
    processDocument(document.id, fileBuffer, file.type)
      .then(async () => {
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (user?.email) {
          await sendProcessingCompleteEmail(user.email, file.name).catch(err => {
            console.error('[documents] Failed to send processing email:', err)
          })
        }
      })
      .catch(err => {
        console.error('[documents] Processing error:', err)
      })

    return NextResponse.json(
      {
        success: true,
        data: { documentId: document.id, processingStatus: 'processing' },
        errorCode: null,
        message: 'Document uploaded and ready. You can start asking questions while we analyze the details.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[documents] POST error:', error)
    return NextResponse.json(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}
