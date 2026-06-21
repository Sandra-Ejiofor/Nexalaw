import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'
import { BCRYPT_SALT_ROUNDS, SESSION_MAX_AGE_SECONDS } from '@/constants'
import { logAuditEvent } from '@/lib/audit'

/**
 * NextAuth configuration for Nexalaw.
 * Uses credentials-based authentication (email + password).
 * Sessions are JWT-based for Vercel serverless compatibility.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.passwordHash) {
          logAuditEvent({
            userId: 'unknown',
            action: 'auth_login_failed',
            timestamp: new Date(),
            errorCode: 'INVALID_CREDENTIALS',
          })
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)

        if (!isValid) {
          logAuditEvent({
            userId: user.id,
            action: 'auth_login_failed',
            timestamp: new Date(),
            errorCode: 'INVALID_PASSWORD',
          })
          return null
        }

        // Update last active timestamp on successful login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastActiveAt: new Date() },
        })

        logAuditEvent({
          userId: user.id,
          action: 'auth_login',
          timestamp: new Date(),
        })

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          role: user.role,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? 'free'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string
        (session.user as { role?: string }).role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth',
    error: '/auth',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

/**
 * Hashes a password using bcrypt with the configured salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
}

/**
 * Verifies a password against a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
