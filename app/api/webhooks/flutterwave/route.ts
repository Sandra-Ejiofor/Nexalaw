import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFlutterwaveWebhook } from '@/lib/flutterwave'
import { ERROR_CODES } from '@/constants/errors'
import type { ApiResponse } from '@/types'

/**
 * POST /api/webhooks/flutterwave — Handle payment webhook events.
 * This route does NOT require a NextAuth session — it uses webhook signature
 * verification instead (per security.md Section 7).
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    // 1. Get the raw payload and signature
    const payload = await request.text()
    const signature = request.headers.get('verif-hash') ?? ''

    // 2. Verify webhook signature — reject immediately if invalid
    if (!verifyFlutterwaveWebhook(payload, signature)) {
      return NextResponse.json(
        { success: false, data: null, errorCode: 'E007', message: 'Invalid webhook signature.' },
        { status: 401 }
      )
    }

    // 3. Parse the verified payload
    const event = JSON.parse(payload) as {
      event?: string
      data?: {
        id?: number
        status?: string
        customer?: {
          email?: string
        }
        meta?: {
          userId?: string
        }
      }
    }

    // 4. Handle payment success events
    if (event.event === 'charge.completed' && event.data?.status === 'successful') {
      const userId = event.data.meta?.userId

      if (userId) {
        // Upgrade user role to pro
        await prisma.user.update({
          where: { id: userId },
          data: { role: 'pro' },
        })
      }
    }

    return NextResponse.json(
      { success: true, data: null, errorCode: null, message: 'Webhook processed.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('[webhooks/flutterwave] error:', error)
    return NextResponse.json(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}
