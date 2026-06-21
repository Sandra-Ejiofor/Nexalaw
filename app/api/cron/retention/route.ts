import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteFromCloudinary } from '@/lib/cloudinary'
import { sendDeletionConfirmationEmail } from '@/lib/email'
import { logAuditEvent } from '@/lib/audit'
import { ERROR_CODES } from '@/constants/errors'
import type { ApiResponse } from '@/types'

/**
 * GET /api/cron/retention — Purge expired documents.
 * Protected by CRON_SECRET — only Vercel Cron can call this.
 * Runs daily at midnight to delete documents past their retentionExpiry.
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

    // Find all expired documents
    const expiredDocuments = await prisma.document.findMany({
      where: {
        retentionExpiry: {
          lte: new Date(),
        },
      },
      include: {
        user: {
          select: { email: true },
        },
      },
    })

    let deletedCount = 0

    for (const doc of expiredDocuments) {
      try {
        // 1. Delete from Cloudinary
        await deleteFromCloudinary(doc.storageRef)

        // 2. Delete from database (cascades to Clause, RiskFlag, QueryInteraction)
        await prisma.document.delete({
          where: { id: doc.id },
        })

        // 3. Send confirmation email
        await sendDeletionConfirmationEmail(doc.user.email, doc.fileName).catch(err => {
          console.error('[retention] Failed to send deletion email:', err)
        })

        logAuditEvent({
          userId: doc.userId,
          action: 'document_deletion',
          timestamp: new Date(),
          documentId: doc.id,
        })

        deletedCount++
      } catch (docError) {
        console.error(`[retention] Failed to delete document ${doc.id}:`, docError)
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: { deletedCount, totalExpired: expiredDocuments.length },
        errorCode: null,
        message: `Purged ${deletedCount} expired documents.`,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[retention] Cron error:', error)
    return NextResponse.json(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}
