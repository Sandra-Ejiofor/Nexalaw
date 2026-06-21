export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  // 10MB
export const RETENTION_DAYS = 30
export const EXPIRY_WARNING_DAYS = 7
export const DEEPSEEK_TIMEOUT_MS = 30_000
export const BCRYPT_SALT_ROUNDS = 12
export const MAGIC_LINK_EXPIRY_MINUTES = 15
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60 // 30 days
export const SIGNED_URL_EXPIRY_SECONDS = 3600 // 1 hour
export const CLOUDINARY_FOLDER = 'legal-assistant/documents'

export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

export const ACCEPTED_EXTENSIONS = ['.pdf', '.txt', '.docx'] as const

export const LEGAL_DISCLAIMER =
  'This is an educational and legal literacy tool. It does not constitute legal advice. Consult a qualified legal professional for legal decisions.'
