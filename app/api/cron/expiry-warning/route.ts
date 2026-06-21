import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendExpiryWarningEmail } from '@/lib/email'
import { EXPIRY_WARNING_DAYS } from '@/constants'
import { ERROR_CODES } from '@/constants/errors'
import type { ApiResponse } from '@/types'

/**
 * GET /api/cron/expiry-warning — Send 7-day expiry warning emails.
 * Protected by CRON_SECRET — only Vercel Cron can call this.
 * Runs daily to notify users about documents expiring within 7 days.
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, data: null, errorCode: 'E007', message: 'Unauthorised.' },
        { status: 401 }
      )
    }

    const warningDate = new Date(Date.now() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000)
    const now = new Date()

    // Find documents expiring within the warning window
    const expiringDocuments = await prisma.document.findMany({
      where: {
        retentionExpiry: {
          gte: now,
          lte: warningDate,
        },
      },
      include: {
        user: {
          select: { email: true },
        },
      },
    })

    let notifiedCount = 0

    for (const doc of expiringDocuments) {
      try {
        await sendExpiryWarningEmail(
          doc.user.email,
          doc.fileName,
          doc.retentionExpiry
        )
        notifiedCount++
      } catch (emailError) {
        console.error(`[expiry-warning] Failed to send warning for ${doc.id}:`, emailError)
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: { notifiedCount, totalExpiring: expiringDocuments.length },
        errorCode: null,
        message: `Sent ${notifiedCount} expiry warning emails.`,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[expiry-warning] Cron error:', error)
    return NextResponse.json(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}
