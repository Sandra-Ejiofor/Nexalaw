# architecture.md — Nexalaw

These rules govern how the codebase is structured, how data flows through the system, and how every layer of the application must be organised. Read this file before creating any file, route, component, or library function.

---

## 1. Application Architecture

Nexalaw is a Next.js 14 App Router application. The architecture follows a strict layered pattern:

```
Request
  └── Route Handler (app/api/)
        └── Validator (lib/validators/)
              └── Scope Classifier (lib/rag/classifier.ts)
                    └── Business Logic (lib/)
                          └── Prisma ORM (lib/prisma.ts)
                                └── Neon PostgreSQL
```

Each layer has one responsibility. No layer skips another.

---

## 2. Routing Architecture

### App Router Route Groups

| Route Group | Path | Purpose |
|-------------|------|---------|
| `(auth)` | `/login`, `/register` | Unauthenticated pages |
| `(dashboard)` | `/chat`, `/chat/[id]`, `/library`, `/settings` | Authenticated pages (sidebar layout) |
| `api` | `/api/**` | All server-side API endpoints |

### Route Protection
- The `(dashboard)` group layout (`app/(dashboard)/layout.tsx`) is the single point of auth enforcement for all protected pages.
- It must call `getServerSession()` and redirect to `/login` if no valid session exists.
- Individual page components inside `(dashboard)` must not re-implement auth checks — the layout handles it.

### API Route Naming
All API routes follow REST conventions:

| Operation | Method | Path |
|-----------|--------|------|
| Send chat message | `POST` | `/api/chat` |
| Get chat messages | `GET` | `/api/chat/[id]` |
| Delete chat session | `DELETE` | `/api/chat/[id]` |
| Upload document | `POST` | `/api/documents` |
| List library documents | `GET` | `/api/documents` |
| Get document summary | `GET` | `/api/documents/[id]` |
| Query a document | `POST` | `/api/documents/[id]/query` |
| Get risk flags | `GET` | `/api/documents/[id]/risks` |
| Generate legal document | `POST` | `/api/generate` |
| Purge expired documents | `GET` | `/api/cron/retention` |
| Send expiry warnings | `GET` | `/api/cron/expiry-warning` |
| Flutterwave webhook | `POST` | `/api/webhooks/flutterwave` |

---

## 3. RAG Pipeline Architecture

The RAG pipeline is the core technical system of Nexalaw. It lives entirely in `lib/rag/` and consists of four sequential steps. No step may be skipped.

```
User Input
    │
    ▼
[1] lib/rag/classifier.ts       ← Scope classification (in_scope / ambiguous / out_of_scope)
    │
    ▼
[2] lib/rag/extractor.ts        ← Text extraction + clause identification from document
    │
    ▼
[3] lib/rag/embeddings.ts       ← Generate embeddings; retrieve most relevant clauses
    │
    ▼
[4] lib/rag/generator.ts        ← Send to DeepSeek API with clause context; receive response
    │
    ▼
Structured Response → API Route → Client
```

### Step 1 — Scope Classifier (`lib/rag/classifier.ts`)
- Runs on every document upload and every user query before anything else.
- Returns one of three values: `in_scope` | `ambiguous` | `out_of_scope`.
- **Benefit-of-the-Doubt Rule:** A document is `ambiguous` — not `out_of_scope` — if it contains any of the following, even partially:
  - Clause or section headings (e.g. Terms, Payment, Termination, Obligations)
  - Party references or signatory names in a contractual context
  - Legal language: "shall", "herein", "indemnify", "whereas", "pursuant to"
  - Obligation or rights statements
  - Signature blocks or execution sections
  - Dates tied to agreement durations or effective dates
- Only documents with **zero** legal indicators return `out_of_scope`.
- `ambiguous` results proceed to extraction with `confidenceLevel` set to `low`.
- `out_of_scope` results are rejected immediately — error E008 (questions) or E009 (documents).

### Step 2 — Extractor (`lib/rag/extractor.ts`)
- Parses the uploaded file and extracts raw text.
- Identifies and classifies individual clauses from the extracted text.
- Creates `Clause` records in the database via Prisma.
- Updates `Document.processingStatus` at each stage: `pending` → `processing` → `completed` / `failed`.
- For scanned or low-quality PDFs, attempt OCR before returning E002.

### Step 3 — Embeddings (`lib/rag/embeddings.ts`)
- Generates vector embeddings for each extracted clause.
- On query, embeds the user's question and retrieves the most semantically relevant clauses.
- Retrieved clause IDs are stored in `QueryInteraction.retrievedClauses`.

### Step 4 — Generator (`lib/rag/generator.ts`)
- Sends the user query + retrieved clause content to the **DeepSeek API** as grounding context.
- Never sends a query to DeepSeek without clause context when a document is present.
- Receives the response and assigns a `confidenceLevel`: `high` | `medium` | `low` | `unresolved`.
- Appends the legal disclaimer to every response before it is returned.
- If confidence is `low` or `unresolved`, also appends the E005 advisory message.

---

## 4. DeepSeek API Integration

DeepSeek is the AI provider for all response generation in Nexalaw.

### Integration Location
All DeepSeek calls are made from `lib/rag/generator.ts` only. No other file in the codebase may call the DeepSeek API directly.

### Environment Variable
```env
DEEPSEEK_API_KEY=        # DeepSeek API key — never hardcoded
DEEPSEEK_API_URL=        # DeepSeek base URL
DEEPSEEK_MODEL=          # Model identifier (e.g. deepseek-chat)
```

### Call Structure
Every DeepSeek call must follow this structure:

```typescript
// System prompt — sets the AI's role and constraints
const systemPrompt = `
You are a legal document assistant for Nexalaw.
Your role is to help non-lawyers understand legal documents in plain English.
You must:
- Only answer based on the document context provided below.
- Never provide legal advice or simulate a licensed lawyer.
- Always use plain English. No legal jargon in responses.
- If the answer cannot be found in the provided context, say so clearly.
- Never draw on general legal knowledge when document context is available.
`;

// User prompt — includes retrieved clause context + user query
const userPrompt = `
Document context:
${retrievedClauses.map(c => c.rawText).join('\n\n')}

User question:
${userQuery}
`;
```

### Hard Rules for DeepSeek Calls
- The system prompt must be sent on every call — never omit it.
- Clause context must be injected into every call where a document is present.
- Never pass raw user input directly to DeepSeek without sanitization first.
- Never expose the DeepSeek API key to the client — all calls are server-side only.
- Handle DeepSeek API errors gracefully — return E007 to the client, never the raw API error.
- Set a request timeout of **30 seconds** on every DeepSeek call. If exceeded, return E007.

---

## 5. Data Flow Architecture

### Chat Message Flow (Unified)
The chat endpoint handles three message types — Q&A, document query, and document generation — all through a single `POST /api/chat` call. The message type is determined by the request body.

```
Client sends message
  → POST /api/chat
    → Authenticate session
    → Parse message type from request (qa | document_query | generate)
    → If qa (no document):
        → Run scope classifier (lib/rag/classifier.ts)
        → If out_of_scope → return E008
        → Send to DeepSeek for general legal literacy response (lib/rag/generator.ts)
        → Append legal disclaimer
        → Create QueryInteraction record
        → Return { response, confidenceLevel }
    → If document_query:
        → Validate + sanitize query (lib/validators/query.ts)
        → Run scope classifier (lib/rag/classifier.ts)
        → If out_of_scope → return E008
        → Retrieve relevant clauses via embeddings (lib/rag/embeddings.ts)
        → Send to DeepSeek with clause context (lib/rag/generator.ts)
        → Assign confidenceLevel
        → Append legal disclaimer
        → Create QueryInteraction record
        → Return { response, confidenceLevel, retrievedClauseIds }
    → If generate:
        → Validate input parameters
        → Classify request as in_scope
        → Generate document from template + user parameters
        → Upload generated file to Cloudinary
        → Create GeneratedDocument record (generationStatus: pending → completed)
        → Return { generatedDocumentId, storageRef, generationStatus }
```

### Document Upload Flow (via Chat or Library)
```
Client uploads file
  → POST /api/documents
    → Validate file format + size (lib/validators/document.ts)
    → Run scope classifier (lib/rag/classifier.ts)
    → If out_of_scope → return E009
    → Upload to Cloudinary (lib/cloudinary.ts)
    → Create Document record in Prisma (processingStatus: pending)
    → If sessionId provided, link document to active chat session
    → Extract text + classify clauses (lib/rag/extractor.ts)
    → Generate embeddings (lib/rag/embeddings.ts)
    → Evaluate risk patterns → create RiskFlag records
    → Update Document.processingStatus to completed
    → Send notification email (lib/email.ts)
    → Return { documentId, processingStatus }
```

### Document Query Flow (Direct — from Library)
```
Client submits question against a document
  → POST /api/documents/[id]/query
    → Authenticate session
    → Validate + sanitize query (lib/validators/query.ts)
    → Run scope classifier (lib/rag/classifier.ts)
    → If out_of_scope → return E008
    → Retrieve relevant clauses via embeddings (lib/rag/embeddings.ts)
    → Send to DeepSeek with clause context (lib/rag/generator.ts)
    → Assign confidenceLevel
    → Append legal disclaimer
    → Create QueryInteraction record
    → Return { response, confidenceLevel, retrievedClauseIds }
```

### Document Generation Flow (Standalone)
```
Client requests template
  → POST /api/generate
    → Authenticate session
    → Validate input parameters
    → Classify request as in_scope
    → Generate document from template + user parameters
    → Upload generated file to Cloudinary
    → Create GeneratedDocument record (generationStatus: pending → completed)
    → Send notification email
    → Return { generatedDocumentId, storageRef, generationStatus }
```

---

## 6. Prisma Client Singleton

The Prisma client must be instantiated as a singleton to prevent connection exhaustion in the Vercel serverless environment.

`lib/prisma.ts` must follow this pattern:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

No other file may instantiate `new PrismaClient()`. Always import `prisma` from `lib/prisma.ts`.

---

## 7. Document Retention Architecture

Every `Document` record must have `retentionExpiry` set at creation time:

```typescript
retentionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
```

A Vercel Cron job must run daily at midnight to:
1. Query all `Document` records where `retentionExpiry <= now`
2. Delete the file from Cloudinary using `Document.storageRef`
3. Delete the `Document` record from Prisma (cascades to Clause, RiskFlag, QueryInteraction)
4. Send expiry confirmation email to the user

A separate Vercel Cron job must run daily to:
1. Query all `Document` records where `retentionExpiry` is within 7 days
2. Send a warning notification email to the user if not already sent

Cron routes live at:
- `app/api/cron/retention/route.ts` — purge expired documents
- `app/api/cron/expiry-warning/route.ts` — send 7-day warning emails

---

## 8. Audit Logging Architecture

Every significant system event must be logged. Logging is a compliance requirement — not optional.

**Events that must be logged:**
- Document upload (success and failure)
- Document query (every `QueryInteraction` record creation)
- Document generation (every `GeneratedDocument` record creation)
- Document deletion (on expiry)
- Authentication events (login, logout, failed attempts)

**What logs must contain:**
- `userId`
- Action type
- Timestamp
- `documentId` where applicable
- `errorCode` where applicable

**What logs must never contain:**
- Raw document text
- Extracted clause content
- Passwords or tokens
- Raw DeepSeek responses

---

## 9. Error Code Reference

All errors returned from API routes must use these codes. Defined in `constants/errors.ts`.

| Code | Scenario |
|------|----------|
| E001 | No document uploaded |
| E002 | File upload or processing failure |
| E003 | Ambiguous legal question requiring document context |
| E004 | Clause or section not found in document |
| E005 | Low-confidence AI response |
| E006 | Unsupported file format |
| E007 | General server error |
| E008 | Out-of-scope question (non-legal) |
| E009 | Out-of-scope document (zero legal content) |

Do not invent new error codes without updating both `constants/errors.ts` and this file.
