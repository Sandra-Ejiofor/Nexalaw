import { z } from 'zod'
import { sanitizeText } from '@/lib/sanitize'

/**
 * Zod schema for validating and sanitizing query inputs.
 * Strips malicious content before passing to business logic or DeepSeek.
 */
export const queryDocumentSchema = z.object({
  userQuery: z
    .string()
    .min(1, 'Please enter a question')
    .max(2000, 'Question is too long — please keep it under 2000 characters')
    .transform(sanitizeText),
  sessionId: z.string().uuid('Invalid session ID'),
})

export type QueryDocumentInput = z.infer<typeof queryDocumentSchema>

/**
 * Zod schema for validating document generation requests.
 */
export const generateDocumentSchema = z.object({
  templateType: z.enum([
    'nda',
    'service_agreement',
    'employment_contract',
    'lease',
    'partnership_agreement',
  ]),
  inputParameters: z.record(z.string(), z.string()),
  outputFormat: z.enum(['pdf', 'docx']),
})

export type GenerateDocumentInput = z.infer<typeof generateDocumentSchema>
