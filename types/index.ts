import type { ErrorCode } from '@/constants/errors'

// Custom application error class for typed error handling in lib functions
export class NexalawError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'NexalawError'
  }
}

// Standard API response envelope — all API routes return this shape
export interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  errorCode: string | null
  message: string
}

// Audit log action types
export type AuditAction =
  | 'document_upload'
  | 'document_upload_failed'
  | 'document_query'
  | 'document_generation'
  | 'document_deletion'
  | 'auth_login'
  | 'auth_logout'
  | 'auth_login_failed'

// Audit log entry shape — never includes raw text or clause content
export interface AuditLogEntry {
  userId: string
  action: AuditAction
  timestamp: Date
  documentId?: string
  errorCode?: string
}

// Document upload request shape
export interface UploadDocumentRequest {
  fileName: string
  fileType: string
  fileSize: number
}

// Query document request shape
export interface QueryDocumentRequest {
  userQuery: string
  sessionId: string
}

// Generate document request shape
export interface GenerateDocumentRequest {
  templateType: 'nda' | 'service_agreement' | 'employment_contract' | 'lease' | 'partnership_agreement'
  inputParameters: Record<string, string>
  outputFormat: 'pdf' | 'docx'
}

// Scope classification result
export type ScopeClassificationResult = 'in_scope' | 'out_of_scope' | 'ambiguous'

// Confidence level for AI responses
export type ConfidenceLevelValue = 'high' | 'medium' | 'low' | 'unresolved'

// RAG generator response
export interface GeneratorResponse {
  response: string
  confidenceLevel: ConfidenceLevelValue
  retrievedClauseIds: string[]
}

// Session user shape for NextAuth
export interface SessionUser {
  id: string
  email: string
  displayName: string
  role: string
}
