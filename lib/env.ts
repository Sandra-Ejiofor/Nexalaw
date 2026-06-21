/**
 * Validates that all required environment variables are present at startup.
 * Throws an error if any are missing — fails fast rather than silently.
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'FLUTTERWAVE_SECRET_KEY',
  'FLUTTERWAVE_WEBHOOK_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
  'CRON_SECRET',
] as const

// DeepSeek keys are optional at startup — user will add them later
const optionalEnvVars = [
  'DEEPSEEK_API_KEY',
  'DEEPSEEK_API_URL',
  'DEEPSEEK_MODEL',
] as const

export function validateEnv(): void {
  const missing: string[] = []

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }
}

/**
 * Gets an environment variable value, throwing if it is not set.
 * Use for required env vars only.
 */
export function getEnvVar(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

/**
 * Gets an optional environment variable value.
 * Returns undefined if not set.
 */
export function getOptionalEnvVar(key: string): string | undefined {
  return process.env[key] ?? undefined
}
