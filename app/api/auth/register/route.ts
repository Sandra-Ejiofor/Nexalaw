import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { sanitizeText } from '@/lib/sanitize'
import { ERROR_CODES } from '@/constants/errors'
import type { ApiResponse } from '@/types'

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1, 'Display name is required').max(100).transform(sanitizeText),
})

/**
 * POST /api/auth/register — Create a new user account.
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json()
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, data: null, errorCode: 'E007', message: validation.error.issues[0]?.message ?? 'Invalid input.' },
        { status: 400 }
      )
    }

    const { email, password, displayName } = validation.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, data: null, errorCode: 'E007', message: 'An account with this email already exists.' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email,
        displayName,
        passwordHash,
        role: 'free',
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: { userId: user.id },
        errorCode: null,
        message: 'Account created successfully.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[auth/register] POST error:', error)
    return NextResponse.json(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}
