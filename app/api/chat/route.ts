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

    const sessions = await prisma.session.findMany({
      where: { userId, isActive: true, queryCount: { gt: 0 } },
      orderBy: { lastActivityAt: 'desc' },
      include: {
        queryInteractions: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { userQuery: true },
        },
      },
    })

    const data = sessions.map((s) => ({
      id: s.id,
      preview: s.customName ?? s.queryInteractions[0]?.userQuery ?? 'New conversation',
      updatedAt: s.lastActivityAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data,
      errorCode: null,
      message: 'Success.',
    })
  } catch (error) {
    console.error('[chat] GET error:', error)
    return NextResponse.json(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}

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

    const newSession = await prisma.session.create({
      data: { userId },
    })

    return NextResponse.json({
      success: true,
      data: { sessionId: newSession.id },
      errorCode: null,
      message: 'Session created.',
    })
  } catch (error) {
    console.error('[chat] POST error:', error)
    return NextResponse.json(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}
