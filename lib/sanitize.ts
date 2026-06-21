/**
 * Sanitizes text input by stripping HTML tags, JS protocol handlers, and null bytes.
 * Must be called on all text before passing to Prisma or DeepSeek.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')        // strip HTML tags
    .replace(/javascript:/gi, '')   // strip JS protocol
    .replace(/\0/g, '')             // strip null bytes
    .trim()
}
