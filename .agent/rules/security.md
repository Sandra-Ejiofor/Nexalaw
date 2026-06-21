---
trigger: always_on
---

# security.md — Nexalaw

These rules govern every security, privacy, and compliance decision in the Nexalaw codebase. Nexalaw handles sensitive legal documents belonging to real people and businesses. A security failure here is not just a technical problem — it is a legal and reputational one. Every rule in this file is binding with no exceptions.

---

## 1. Secrets and Environment Variables

### Hard Rules
- **Never hardcode any secret, API key, connection string, or credential** anywhere in the codebase — not in source files, not in comments, not in configuration objects.
- All secrets live in `.env` only.
- `.env` is always in `.gitignore`. It must never be committed to version control.
- Maintain a `.env.example` file with all required keys listed but no values. This is the only secrets-related file that gets committed.
- Access environment variables via `process.env.VARIABLE_NAME` only.
- Validate that required environment variables are present at startup. If any are missing, throw an error — do not silently fail.

```typescript
// lib/env.ts — validate on startup
const requiredEnvVars = [
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'DEEPSEEK_API_KEY',
  'DEEPSEEK_API_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'FLUTTERWAVE_SECRET_KEY',
  'FLUTTERWAVE_WEBHOOK_SECRET',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
] as const

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
}
```

### Client-Side Exposure
- Only variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.
- No secret key, API key, or database URL may ever be prefixed with `NEXT_PUBLIC_`.
- Currently, `NEXT_PUBLIC_` variables in Nexalaw are limited to non-sensitive public configuration only.

---

## 2. Authentication and Session Security

### NextAuth Configuration
- Session strategy must be `database` — sessions are stored in PostgreSQL, not JWTs.
- `NEXTAUTH_SECRET` must be a cryptographically random string of at least 32 characters.
- Session expiry must be set — do not leave sessions open indefinitely.
- On every successful login, update `User.lastActiveAt`.

### Password Handling
- Never store plaintext passwords.
- Use `bcrypt` with a minimum salt round of **12** for hashing credentials passwords.
- Never log passwords, even partially.
- Never return password hashes in any API response.

```typescript
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
```

### Route Protection
- Every API route under `app/api/` that is not `auth` or `webhooks/flutterwave` must verify the session before executing any logic.
- The `(dashboard)` layout must enforce session checks for all protected pages.
- An unauthenticated request to a protected route returns `401` with error code `E007` — never a redirect from an API route.

### Magic Link Security
- Magic link tokens must expire after **15 minutes**.
- Used magic link tokens must be invalidated immediately after use — one use per token only.
- Magic links are sent via Nodemailer from the address in `EMAIL_FROM` only.

---

## 3. Input Validation and Sanitization

### Validate Everything
Every piece of user-submitted data is treated as untrusted until validated. This includes:
- File uploads (type, size, content)
- Query text
- Template generation parameters
- URL parameters and route segments
- Webhook payloads

### Zod for All Input
All inputs are validated with Zod schemas in `lib/validators/` before reaching business logic or the database. A validation failure returns the appropriate error code — never a raw Zod error.

### Sanitize Before Use
All text inputs must be sanitized before being passed to:
- Prisma queries
- The DeepSeek API prompt
- Email content
- Cloudinary metadata

Strip HTML tags, script content, and null bytes from all text inputs:

```typescript
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')        // strip HTML tags
    .replace(/javascript:/gi, '')   // strip JS protocol
    .replace(/\0/g, '')             // strip null bytes
    .trim()
}
```

### File Upload Validation
Before any file reaches Cloudinary or the RAG pipeline:

1. Validate MIME type — accepted: `application/pdf`, `text/plain`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
2. Validate file extension — accepted: `.pdf`, `.txt`, `.docx`
3. Validate file size — maximum **10MB** (`MAX_FILE_SIZE_BYTES` constant)
4. Validate file is not empty (size > 0)
5. Reject files where MIME type and extension do not match

Return E006 for invalid format and E002 for failed uploads.

---

## 4. Cross-User Data Access

### Ownership Enforcement
A user may only access, query, or delete their own data. This is enforced at the database query level — not just at the UI level.

Every Prisma query that fetches a `Document`, `Session`, `QueryInteraction`, or `GeneratedDocument` must include a `userId` filter:

```typescript
// Correct — always scope to the authenticated user
const document = await prisma.document.findFirst({
  where: {
    id: documentId,
    userId: session.user.id,  // ownership check
  },
})

// Wrong — no ownership check
const document = await prisma.document.findUnique({
  where: { id: documentId },
})
```

If a document is not found or does not belong to the requesting user, return a `404` — never a `403`. Do not reveal whether the resource exists to a user who does not own it.

---

## 5. DeepSeek API Security

### Server-Side Only
All DeepSeek API calls are made from `lib/rag/generator.ts` on the server only. The DeepSeek API key is never sent to the client or included in any client-side bundle.

### Prompt Injection Prevention
User input is never interpolated directly into the DeepSeek system prompt. The system prompt is fixed and controlled by the application. User input enters only the user message section of the prompt, after sanitization.

```typescript
// Safe structure
const messages = [
  { role: 'system', content: NEXALAW_SYSTEM_PROMPT }, // fixed — never user-controlled
  { role: 'user',   content: sanitizeText(userQuery) } // sanitized user input only
]
```

### Response Handling
- DeepSeek API errors must be caught and logged server-side.
- Raw DeepSeek error messages must never reach the client. Return E007.
- DeepSeek responses must never be stored in logs — only the `confidenceLevel` and response content assigned to `QueryInteraction.systemResponse` are persisted.
- Set a 30-second timeout on every DeepSeek call. If exceeded, return E007.

---

## 6. Document and File Security

### Cloudinary Storage
- All uploaded documents are stored in the dedicated folder `legal-assistant/documents/`.
- The raw Cloudinary URL is never exposed to the client.
- Documents are served through a signed URL generated server-side with a short expiry (maximum 1 hour).
- `Document.storageRef` stores the Cloudinary `public_id`, not the full URL.

### Document Access
- Documents are fetched from Cloudinary server-side only.
- Client components never receive a direct Cloudinary URL — they receive a short-lived signed URL from the server.

### Document Deletion
When a document is deleted (manually or on retention expiry):
1. Delete the file from Cloudinary using the `public_id`
2. Delete the `Document` record from Prisma (cascades to Clause, RiskFlag, QueryInteraction)
3. Never leave orphaned files in Cloudinary storage

---

## 7. Flutterwave Webhook Security

Every incoming Flutterwave webhook must be verified before processing:

```typescript
import crypto from 'crypto'

export function verifyFlutterwaveWebhook(
  payload: string,
  signature: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.FLUTTERWAVE_SECRET_KEY!)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}
```

- If the signature does not match, return `401` immediately — do not process the payload.
- Never update `User.role` based on an unverified webhook.
- Webhook route is at `app/api/webhooks/flutterwave/route.ts` — it is the only route that does not require a NextAuth session (it uses webhook signature verification instead).

---

## 8. API Security Headers

All API responses must include appropriate security headers. Configure these in `next.config.js`:

```javascript
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',  value: 'on' },
  { key: 'X-Frame-Options',          value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options',   value: 'nosniff' },
  { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // tighten in production
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: res.cloudinary.com",
      "connect-src 'self' api.deepseek.com",
    ].join('; '),
  },
]
```

---

## 9. Data Privacy and Compliance

### Document Data
- Uploaded legal documents contain sensitive personal and business data.
- Documents are never used for AI model training without explicit, informed user consent.
- Documents are never shared between users under any circumstances.
- Document text is never included in logs — only metadata (documentId, userId, timestamps, error codes).

### Document Retention
- Every `Document` record has `retentionExpiry` set to 30 days from upload.
- Expired documents are purged from both Cloudinary and Prisma on schedule.
- Users are notified 7 days before expiry.
- Retention enforcement is a compliance requirement — it must not be disabled or bypassed.

### Disclaimer Enforcement
Every AI-generated response returned to the user must include:
> *"This is an educational and legal literacy tool. It does not constitute legal advice. Consult a qualified legal professional for legal decisions."*

This is a regulatory requirement. It must appear on every response without exception.

### FTC / Regulatory Compliance
- No marketing copy or product UI may claim that Nexalaw provides legal advice.
- No UI copy may claim that Nexalaw replaces a lawyer.
- Any feature description must accurately reflect what the system does.

---



---

## 11. Hard Security Constraints — Summary

| Constraint | Consequence of Violation |
|------------|--------------------------|
| Never hardcode secrets | Credential exposure — critical |
| Never expose `DEEPSEEK_API_KEY` to the client | API key theft — critical |
| Never skip `userId` filter on data queries | Cross-user data leakage — critical |
| Never process unverified Flutterwave webhooks | Payment fraud — critical |
| Never return raw Prisma or DeepSeek errors to client | Internal exposure — high |
| Never store document text in logs | Compliance violation — high |
| Never serve raw Cloudinary URLs to client | Uncontrolled document access — high |
| Never omit the legal disclaimer | Regulatory non-compliance — high |
| Never store plaintext passwords | Credential exposure — critical |
| Never skip input sanitization before DeepSeek | Prompt injection — high |
