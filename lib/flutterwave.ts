import crypto from 'crypto'

/**
 * Verifies a Flutterwave webhook signature using HMAC-SHA256.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param payload - The raw webhook payload as a string
 * @param signature - The signature header from the webhook request
 * @returns true if the signature is valid
 */
export function verifyFlutterwaveWebhook(
  payload: string,
  signature: string
): boolean {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('Missing FLUTTERWAVE_WEBHOOK_SECRET environment variable')
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  // Both buffers must be the same length for timingSafeEqual
  if (signature.length !== expectedSignature.length) {
    return false
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}
