import { z } from 'zod'
import { MAX_FILE_SIZE_BYTES, ACCEPTED_MIME_TYPES } from '@/constants'

/**
 * Zod schema for validating document upload requests.
 * Validates MIME type, file size, and extension match before
 * the file reaches Cloudinary or the RAG pipeline.
 */
export const uploadDocumentSchema = z.object({
  fileName: z.string().min(1, 'File name is required').max(255, 'File name too long'),
  fileType: z.enum(
    ACCEPTED_MIME_TYPES as unknown as [string, ...string[]],
    { message: 'Unsupported file format. Please upload a PDF, TXT, or DOCX file.' }
  ),
  fileSize: z
    .number()
    .positive('File must not be empty')
    .max(MAX_FILE_SIZE_BYTES, 'File size exceeds the 10MB limit'),
})

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>

/**
 * Validates that the file extension matches its MIME type.
 * Returns true if the extension and MIME type are consistent.
 */
export function validateExtensionMimeMatch(
  fileName: string,
  mimeType: string
): boolean {
  const extension = fileName.toLowerCase().split('.').pop()

  const mimeToExtension: Record<string, string> = {
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  }

  const expectedExtension = mimeToExtension[mimeType]
  if (!expectedExtension) {
    return false
  }

  return extension === expectedExtension
}
