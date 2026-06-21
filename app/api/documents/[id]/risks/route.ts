import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@/constants/errors'
import type { ApiResponse } from '@/types'

/**
 * GET /api/documents/[id]/risks — Get all risk flags for a document.
 * Scoped to the authenticated user for ownership enforcement.
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

    // Ownership check
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

    const riskFlags = await prisma.riskFlag.findMany({
      where: { documentId },
      include: {
        clause: {
          select: {
            clauseType: true,
            rawText: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          riskFlags: riskFlags.map(flag => ({
            id: flag.id,
            riskLevel: flag.riskLevel,
            riskCategory: flag.riskCategory,
            description: flag.description,
            recommendation: flag.recommendation,
            clauseType: flag.clause.clauseType,
            clauseText: flag.clause.rawText.substring(0, 200),
            createdAt: flag.createdAt,
          })),
        },
        errorCode: null,
        message: 'Success.',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[documents/[id]/risks] GET error:', error)
    return NextResponse.json(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}
