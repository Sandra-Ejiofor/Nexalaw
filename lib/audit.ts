import type { AuditLogEntry } from '@/types'

/**
 * Logs an audit event for compliance. Logs capture userId, action, timestamp,
 * documentId, and errorCode — but never raw document text, clause content,
 * passwords, or API responses.
 *
 * In production, this should write to a persistent audit store.
 * For now, we log to the server console in structured JSON format.
 */
export function logAuditEvent(entry: AuditLogEntry): void {
  const logEntry = {
    ...entry,
    timestamp: entry.timestamp.toISOString(),
  }

  // Structured JSON log for compliance — never includes raw text
  console.log(`[AUDIT] ${JSON.stringify(logEntry)}`)
}
