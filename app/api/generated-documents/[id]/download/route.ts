import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSignedUrl } from '@/lib/cloudinary'
import { ERROR_CODES } from '@/constants/errors'
import type { ApiResponse } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

    if (!doc || !doc.storageRef) {
      return NextResponse.json(
        { success: false, data: null, errorCode: 'E007', message: 'Document not found or not ready for download.' },
        { status: 404 }
      )
    }

    const downloadUrl = getSignedUrl(doc.storageRef)

    return NextResponse.redirect(downloadUrl)
  } catch (error) {
    console.error('[generated-documents/download] GET error:', error)
    return NextResponse.json(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}
