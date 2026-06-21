import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@/constants/errors'
import type { ApiResponse } from '@/types'

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

    const { id } = await params

    const chatSession = await prisma.session.findFirst({
      where: { id, userId },
      include: {
        queryInteractions: {
          orderBy: { createdAt: 'asc' },
        },
        documents: {
          take: 1,
          select: {
            id: true,
            fileName: true,
          },
        },
      },
    })

    if (!chatSession) {
      return NextResponse.json(
        { success: false, data: null, errorCode: 'E004', message: ERROR_CODES.E004 },
        { status: 404 }
      )
    }

    const messages = chatSession.queryInteractions.flatMap((qi) => [
      {
        role: 'user',
        content: qi.userQuery,
        createdAt: qi.createdAt,
      },
      ...(qi.systemResponse
        ? [
            {
              role: 'assistant',
              content: qi.systemResponse,
              confidence: qi.confidenceLevel,
              createdAt: qi.responseAt ?? qi.createdAt,
            },
          ]
        : []),
    ])

    const data = {
      id: chatSession.id,
      messages,
      documentId: chatSession.documents[0]?.id ?? null,
      documentName: chatSession.documents[0]?.fileName ?? null,
    }

    return NextResponse.json({
      success: true,
      data,
      errorCode: null,
      message: 'Success.',
    })
  } catch (error) {
    console.error('[chat/id] GET error:', error)
    return NextResponse.json(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    const { id } = await params
    const { customName } = await request.json()

    if (!customName || typeof customName !== 'string' || customName.trim().length === 0) {
      return NextResponse.json(
        { success: false, data: null, errorCode: 'E007', message: 'Name cannot be empty.' },
        { status: 400 }
      )
    }

    const updatedSession = await prisma.session.update({
      where: { id, userId },
      data: { customName: customName.trim() },
    })

    return NextResponse.json({
      success: true,
      data: updatedSession,
      errorCode: null,
      message: 'Renamed successfully.',
    })
  } catch (error) {
    console.error('[chat/id] PATCH error:', error)
    return NextResponse.json(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const { id } = await params

    await prisma.session.update({
      where: { id, userId },
      data: { isActive: false },
    })

    return NextResponse.json({
      success: true,
      data: null,
      errorCode: null,
      message: 'Deleted successfully.',
    })
  } catch (error) {
    console.error('[chat/id] DELETE error:', error)
    return NextResponse.json(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}

