import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@/constants/errors'
import type { ApiResponse } from '@/types'

export async function GET(
  _request: NextRequest,
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

    const doc = await prisma.generatedDocument.findFirst({
      where: { id, userId },
    })

    if (!doc) {
      return NextResponse.json(
        { success: false, data: null, errorCode: 'E007', message: 'Generated document not found.' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: doc,
        errorCode: null,
        message: 'Generated document retrieved successfully.',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[generated-documents/id] GET error:', error)
    return NextResponse.json(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}
