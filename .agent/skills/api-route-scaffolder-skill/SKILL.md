# SKILL.md — API Route Scaffolder
### Nexalaw · Next.js 14 App Router · TypeScript Strict · Prisma · DeepSeek

---

## Purpose

This skill governs how every API route in Nexalaw is built. Use it whenever you are creating or modifying any file inside `app/api/`. It covers the mandatory response envelope, authentication pattern, scope classification gate, input validation, error handling, audit logging, and Nexalaw-specific route implementations.

---

## Pre-Flight Checklist

Before writing any route code, confirm all of the following:

- [ ] I know which route this is and its HTTP method (GET / POST / DELETE)
- [ ] I have read `.agent/rules/architecture.md` — data flow, RAG pipeline, error codes
- [ ] I have read `.agent/rules/security.md` — auth enforcement, ownership scoping, input sanitization
- [ ] I have read `.agent/rules/code-style.md` — response envelope, error handling, TypeScript rules
- [ ] I know which Prisma models this route reads or writes
- [ ] I know whether this route requires scope classification (document upload and query routes always do)
- [ ] I know whether this route requires a NextAuth session (all routes except `/api/webhooks/flutterwave`)

---

## 1. Route Map

These are the only API routes in Nexalaw. Do not create routes outside this map without updating AGENTS.md.

| Route | Method | Auth Required | Scope Classification | Description |
|-------|--------|--------------|---------------------|-------------|
| `/api/documents` | `POST` | Yes | Yes — document | Upload a legal document |
| `/api/documents/[id]` | `GET` | Yes | No | Get document summary + clauses |
| `/api/documents/[id]/query` | `POST` | Yes | Yes — query | Ask a question about a document |
| `/api/documents/[id]/risks` | `GET` | Yes | No | Get risk flags for a document |
| `/api/generate` | `POST` | Yes | Yes — query | Generate a legal document template |
| `/api/auth/[...nextauth]` | `GET/POST` | No | No | NextAuth handler |
| `/api/webhooks/flutterwave` | `POST` | No (signature) | No | Flutterwave payment webhook |
| `/api/cron/retention` | `GET` | Cron secret | No | Purge expired documents |
| `/api/cron/expiry-warning` | `GET` | Cron secret | No | Send 7-day expiry warning emails |

---

## 2. Mandatory Response Envelope

**Every** API response — success or failure — uses this exact shape. No exceptions.

```typescript
type ApiResponse<T = null> = {
  success: boolean
  data: T | null
  errorCode: string | null
  message: string
}
```

```typescript
// Success response
return NextResponse.json<ApiResponse<DocumentSummary>>(
  {
    success: true,
    data: documentSummary,
    errorCode: null,
    message: 'Document summary retrieved successfully.',
  },
  { status: 200 }
)

// Error response
return NextResponse.json<ApiResponse>(
  {
    success: false,
    data: null,
    errorCode: 'E004',
    message: ERROR_CODES.E004,
  },
  { status: 404 }
)
```

**HTTP status codes to use:**

| Scenario | Status |
|----------|--------|
| Success | 200 |
| Created (new resource) | 201 |
| Validation failure | 400 |
| Unauthenticated | 401 |
| Forbidden / wrong owner | 404 (not 403 — do not reveal resource existence) |
| Not found | 404 |
| Server error | 500 |

---

## 3. Base Route Template

Every route follows this exact structure — steps in order, no skipping:

```typescript
// app/api/[route]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@/constants/errors'
import type { ApiResponse } from '@/types'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ── Step 1: Authenticate ─────────────────────────────────────────────────
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse>(
        { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
        { status: 401 }
      )
    }

    // ── Step 2: Parse and validate input ─────────────────────────────────────
    const body = await request.json()
    const parsed = myZodSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, data: null, errorCode: 'E007', message: 'Invalid request data.' },
        { status: 400 }
      )
    }

    // ── Step 3: Scope classification (where applicable) ───────────────────────
    // See Section 5 of this skill for scope gate implementation

    // ── Step 4: Business logic ────────────────────────────────────────────────
    // Always scope Prisma queries to session.user.id
    const result = await prisma.document.findFirst({
      where: { id: parsed.data.documentId, userId: session.user.id }
    })
    if (!result) {
      return NextResponse.json<ApiResponse>(
        { success: false, data: null, errorCode: 'E004', message: ERROR_CODES.E004 },
        { status: 404 }
      )
    }

    // ── Step 5: Return envelope ───────────────────────────────────────────────
    return NextResponse.json<ApiResponse<typeof result>>(
      { success: true, data: result, errorCode: null, message: 'Success.' },
      { status: 200 }
    )

  } catch (error) {
    // ── Step 6: Catch-all error handler ──────────────────────────────────────
    console.error('[POST /api/route] unexpected error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}
```

---

## 4. Route Implementations

### 4.1 POST `/api/documents` — Upload Document

```typescript
// app/api/documents/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { classifyScope } from '@/lib/rag/classifier'
import { extractAndClassifyClauses } from '@/lib/rag/extractor'
import { generateEmbeddings } from '@/lib/rag/embeddings'
import { evaluateRisks } from '@/lib/rag/extractor'
import { sendDocumentProcessedEmail } from '@/lib/email'
import { documentUploadSchema } from '@/lib/validators/document'
import { ERROR_CODES } from '@/constants/errors'
import { RETENTION_DAYS } from '@/constants/document'
import type { ApiResponse } from '@/types'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse>(
        { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
        { status: 401 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json<ApiResponse>(
        { success: false, data: null, errorCode: 'E001', message: ERROR_CODES.E001 },
        { status: 400 }
      )
    }

    // Validate file
    const validated = documentUploadSchema.safeParse({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    })
    if (!validated.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, data: null, errorCode: 'E006', message: ERROR_CODES.E006 },
        { status: 400 }
      )
    }

    // Extract text for scope classification
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const extractedText = await extractTextFromBuffer(fileBuffer, file.type)

    // Scope classification — must happen before any DB write
    const scopeResult = await classifyScope(extractedText, 'document')
    if (scopeResult === 'out_of_scope') {
      return NextResponse.json<ApiResponse>(
        { success: false, data: null, errorCode: 'E009', message: ERROR_CODES.E009 },
        { status: 422 }
      )
    }

    // Upload to Cloudinary
    const { publicId, storageRef } = await uploadToCloudinary(fileBuffer, file.name)

    // Create Document record
    const retentionExpiry = new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000)
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        fileType: validated.data.fileType,
        fileSize: file.size,
        storageRef: publicId,
        scopeStatus: scopeResult === 'ambiguous' ? 'unclassified' : 'legal',
        processingStatus: 'pending',
        retentionExpiry,
        extractedText,
      },
    })

    // Process asynchronously (update status as pipeline progresses)
    void processDocumentAsync(document.id, extractedText, session.user.email!)

    return NextResponse.json<ApiResponse<{ documentId: string; processingStatus: string }>>(
      {
        success: true,
        data: { documentId: document.id, processingStatus: 'pending' },
        errorCode: null,
        message: 'Document uploaded successfully. Processing has begun.',
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('[POST /api/documents] error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, data: null, errorCode: 'E002', message: ERROR_CODES.E002 },
      { status: 500 }
    )
  }
}
```

---

### 4.2 POST `/api/documents/[id]/query` — Query a Document

```typescript
// app/api/documents/[id]/query/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { classifyScope } from '@/lib/rag/classifier'
import { retrieveRelevantClauses } from '@/lib/rag/embeddings'
import { generateResponse } from '@/lib/rag/generator'
import { sanitizeText } from '@/lib/validators/query'
import { querySchema } from '@/lib/validators/query'
import { ERROR_CODES } from '@/constants/errors'
import type { ApiResponse } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse>(
        { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = querySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, data: null, errorCode: 'E007', message: 'Invalid query.' },
        { status: 400 }
      )
    }

    const sanitizedQuery = sanitizeText(parsed.data.query)

    // Scope classification on query
    const scopeResult = await classifyScope(sanitizedQuery, 'query')
    if (scopeResult === 'out_of_scope') {
      // Log the interaction even for out-of-scope queries
      await prisma.queryInteraction.create({
        data: {
          sessionId: parsed.data.sessionId,
          documentId: params.id,
          userId: session.user.id,
          userQuery: sanitizedQuery,
          scopeClassification: 'out_of_scope',
          retrievedClauses: [],
          errorCode: 'E008',
        },
      })
      return NextResponse.json<ApiResponse>(
        { success: false, data: null, errorCode: 'E008', message: ERROR_CODES.E008 },
        { status: 422 }
      )
    }

    // Verify document ownership
    const document = await prisma.document.findFirst({
      where: { id: params.id, userId: session.user.id },
    })
    if (!document) {
      return NextResponse.json<ApiResponse>(
        { success: false, data: null, errorCode: 'E004', message: ERROR_CODES.E004 },
        { status: 404 }
      )
    }

    // Retrieve relevant clauses via RAG
    const relevantClauses = await retrieveRelevantClauses(sanitizedQuery, params.id)
    if (relevantClauses.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, data: null, errorCode: 'E004', message: ERROR_CODES.E004 },
        { status: 404 }
      )
    }

    // Generate response via DeepSeek
    const { response, confidenceLevel } = await generateResponse(sanitizedQuery, relevantClauses)

    // Log QueryInteraction
    const interaction = await prisma.queryInteraction.create({
      data: {
        sessionId: parsed.data.sessionId,
        documentId: params.id,
        userId: session.user.id,
        userQuery: sanitizedQuery,
        scopeClassification: scopeResult,
        retrievedClauses: relevantClauses.map((c) => c.id),
        systemResponse: response,
        confidenceLevel,
        errorCode: confidenceLevel === 'low' || confidenceLevel === 'unresolved' ? 'E005' : null,
        responseAt: new Date(),
      },
    })

    // Update session query count
    await prisma.session.update({
      where: { id: parsed.data.sessionId },
      data: { queryCount: { increment: 1 }, lastActivityAt: new Date() },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          response,
          confidenceLevel,
          retrievedClauseIds: relevantClauses.map((c) => c.id),
          // Low confidence advisory is appended by generator.ts — included in response
        },
        errorCode: confidenceLevel === 'low' || confidenceLevel === 'unresolved' ? 'E005' : null,
        message: 'Query processed successfully.',
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('[POST /api/documents/[id]/query] error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, data: null, errorCode: 'E007', message: ERROR_CODES.E007 },
      { status: 500 }
    )
  }
}
```

---

### 4.3 POST `/api/webhooks/flutterwave` — Payment Webhook

```typescript
// app/api/webhooks/flutterwave/route.ts
// Note: This route does NOT use NextAuth — it uses webhook signature verification instead
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyFlutterwaveWebhook } from '@/lib/flutterwave'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('verif-hash') ?? ''

    // Always verify before processing — reject unverified payloads
    const isValid = verifyFlutterwaveWebhook(rawBody, signature)
    if (!isValid) {
      console.warn('[flutterwave webhook] invalid signature')
      return new NextResponse('Unauthorised', { status: 401 })
    }

    const payload = JSON.parse(rawBody)

    // Only process successful charge events
    if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
      const userEmail = payload.data.customer.email

      await prisma.user.update({
        where: { email: userEmail },
        data: { role: 'pro' },
      })

      console.info('[flutterwave webhook] upgraded user to pro:', userEmail)
    }

    return new NextResponse('OK', { status: 200 })

  } catch (error) {
    console.error('[flutterwave webhook] error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
```

---

## 5. Scope Classification Gate

For routes that require scope classification, apply this gate immediately after input validation:

```typescript
// Scope gate pattern — copy into upload and query routes
const scopeResult = await classifyScope(inputText, type) // 'document' | 'query'

if (scopeResult === 'out_of_scope') {
  const errorCode = type === 'document' ? 'E009' : 'E008'
  return NextResponse.json<ApiResponse>(
    { success: false, data: null, errorCode, message: ERROR_CODES[errorCode] },
    { status: 422 }
  )
}

// If ambiguous: proceed but flag for low confidence downstream
const isAmbiguous = scopeResult === 'ambiguous'
```

---

## 6. Input Validation with Zod

All route validation schemas live in `lib/validators/`. Use them — never inline schemas in route files.

```typescript
// lib/validators/document.ts
import { z } from 'zod'
import { MAX_FILE_SIZE_BYTES } from '@/constants/document'

export const documentUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.enum([
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
  fileSize: z.number().min(1).max(MAX_FILE_SIZE_BYTES),
})

// lib/validators/query.ts
import { z } from 'zod'

export const querySchema = z.object({
  query: z.string().min(1).max(2000),
  sessionId: z.string().uuid(),
})

export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/\0/g, '')
    .trim()
}
```

---

## 7. Cron Route Pattern

Cron routes are protected by a secret header — not NextAuth:

```typescript
// app/api/cron/retention/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteFromCloudinary } from '@/lib/cloudinary'
import { sendDocumentDeletedEmail } from '@/lib/email'

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify Vercel cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorised', { status: 401 })
  }

  const expiredDocuments = await prisma.document.findMany({
    where: { retentionExpiry: { lte: new Date() } },
    include: { user: true },
  })

  for (const doc of expiredDocuments) {
    try {
      await deleteFromCloudinary(doc.storageRef)
      await sendDocumentDeletedEmail(doc.user.email, doc.fileName)
      await prisma.document.delete({ where: { id: doc.id } })
      console.info('[cron/retention] purged document:', doc.id)
    } catch (error) {
      console.error('[cron/retention] failed to purge document:', doc.id, error)
    }
  }

  return NextResponse.json({ purged: expiredDocuments.length })
}
```

Add to `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/retention",       "schedule": "0 0 * * *" },
    { "path": "/api/cron/expiry-warning",  "schedule": "0 9 * * *" }
  ]
}
```

---

## 8. API Route Definition of Done

A route is complete only when:

- [ ] Follows the base template: authenticate → validate → classify scope → business logic → return envelope
- [ ] Returns the standard `ApiResponse` envelope on every response path — success and all error cases
- [ ] Session is verified with `getServerSession` before any logic (except `/api/webhooks/flutterwave` and cron routes)
- [ ] All Prisma queries include `userId: session.user.id` for ownership scoping
- [ ] Scope classification runs before processing on document upload and query routes
- [ ] Input validated with Zod schema from `lib/validators/`
- [ ] All text inputs sanitized before reaching Prisma or DeepSeek
- [ ] `QueryInteraction` record created for every query — including out-of-scope queries
- [ ] `retentionExpiry` set on every new `Document` record
- [ ] Catch block logs the error server-side and returns `E007` to the client
- [ ] No raw Prisma errors, stack traces, or internal details returned to the client
- [ ] TypeScript compiles with zero errors in strict mode
