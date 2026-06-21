import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@/constants/errors'
import type { ApiResponse } from '@/types'

/**
 * GET /api/documents/[id] — Get document summary and clauses.
 * Always scoped to the authenticated user for ownership enforcement.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: documentId } = await params

    // Ownership check — always filter by userId
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId,
      },
      include: {
        clauses: {
          orderBy: { startIndex: 'asc' },
        },
      },
    })

    // Return 404 whether not found or not owned — never reveal existence to non-owner
    if (!document) {
      return NextResponse.json(
        { success: false, data: null, errorCode: 'E004', message: ERROR_CODES.E004 },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: document.id,
          fileName: document.fileName,
          fileType: document.fileType,
          documentType: document.documentType,
          scopeStatus: document.scopeStatus,
          processingStatus: document.processingStatus,
          uploadedAt: document.uploadedAt,
          processedAt: document.processedAt,
          retentionExpiry: document.retentionExpiry,
          clauses: document.clauses.map(clause => ({
            id: clause.id,
            clauseType: clause.clauseType,
            rawText: clause.rawText,
            simplifiedText: clause.simplifiedText,
            pageNumber: clause.pageNumber,
            isFlagged: clause.isFlagged,
          })),
        },
        errorCode: null,
        message: 'Success.',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[documents/[id]] GET error:', error)
    return NextResponse.json(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}
