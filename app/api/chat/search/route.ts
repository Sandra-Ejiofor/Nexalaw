import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@/constants/errors'
import type { ApiResponse } from '@/types'

export async function GET(
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

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')

    if (!q || !q.trim()) {
      return NextResponse.json({
        success: true,
        data: [],
        errorCode: null,
        message: 'Success.',
      })
    }

    const sessions = await prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        queryInteractions: {
          some: {
            OR: [
              { userQuery: { contains: q, mode: 'insensitive' } },
              { systemResponse: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      },
      orderBy: { lastActivityAt: 'desc' },
      include: {
        queryInteractions: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: {
            userQuery: true,
            createdAt: true,
          },
        },
      },
    })

    const data = sessions.map((s) => ({
      id: s.id,
      preview: s.customName ?? s.queryInteractions[0]?.userQuery ?? 'New conversation',
      date: s.lastActivityAt,
    }))

    return NextResponse.json({
      success: true,
      data,
      errorCode: null,
      message: 'Success.',
    })
  } catch (error) {
    console.error('[chat/search] GET error:', error)
    return NextResponse.json(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}
