# AGENTS.md — Nexalaw

This file is the architectural briefing for any AI agent working on this codebase. Read it fully before writing any code, creating any file, or making any decision.

Behavioural and coding standard rules live in `.agent/rules/`. Always read the relevant rule files before starting any task. This file and the rules folder are both binding.

---

## 1. Product Context

**Product:** Nexalaw
**Purpose:** Nexalaw is a **Q&A-first legal literacy chat interface** powered by a large language model. Users open the app and are immediately greeted by a chat where they can ask legal questions in plain English. The primary interaction is conversation — users ask questions, and the AI responds with clear, plain-English answers.

The tool is designed to make legal knowledge less intimidating and more understandable for everyday users — always positioning itself as a legal literacy aid rather than a replacement for a qualified lawyer.

**Dashboard layout:**
- **Sidebar** with four primary actions:
  - **New Chat** — starts a fresh chat session
  - **Search Chat** — search through all past conversations
  - **Library** — view all uploaded documents and generated documents
  - **History** — browse all past chat sessions
- **Main area** — the active chat interface

**Core user flow:**
1. User lands on the dashboard → sees the sidebar + chat area
2. Clicks **New Chat** → new chat session opens
3. Within a chat, user can:
   a. **Ask a legal question** — AI classifies scope, responds with plain-English info
   b. **Upload a document** — attaches to the chat; subsequent questions are grounded in the document text
   c. **Generate a legal document** — selects a template (NDA, service agreement, etc.), fills parameters, AI generates it
4. All chats are saved and accessible under **History**
5. All uploaded and generated documents are accessible under **Library**

**What this product is not:** It is not a substitute for licensed legal counsel. It is a legal literacy and document comprehension tool.

**Non-negotiable product rule:** Every AI-generated response must carry this disclaimer:
> *"This is an educational and legal literacy tool. It does not constitute legal advice. Consult a qualified legal professional for legal decisions."*

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript — strict mode at all times |
| Database | PostgreSQL via Prisma ORM |
| Database Host | Neon (serverless PostgreSQL) |
| Auth | NextAuth.js (credentials + email magic link) |
| File Storage | Cloudinary (uploaded legal documents) |
| Email | Nodemailer (transactional emails) |
| Payments | Flutterwave |
| Deployment | Vercel |

### Neon + Prisma Connection Setup

Neon hosts the PostgreSQL database. Prisma connects to it via two URLs — always both, never one:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled — runtime queries
  directUrl = env("DIRECT_URL")     // direct — migrations only
}
```

`DATABASE_URL` → Neon pooled connection string (runtime)
`DIRECT_URL` → Neon direct connection string (migrations only)

See `.agent/rules/database.md` for full database rules.

---

## 3. Project Structure

Follow this directory structure exactly. Do not create directories outside of it without a clear reason.

```
/
├── app/                          # Next.js 14 App Router
│   ├── (auth)/                   # Auth route group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/              # Protected route group
│   │   ├── layout.tsx            # Sidebar layout (New Chat, Search, Library, History)
│   │   ├── page.tsx              # Redirect to /chat
│   │   ├── chat/
│   │   │   ├── page.tsx          # New chat (no active session)
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Specific chat session
│   │   ├── library/
│   │   │   └── page.tsx          # Document library (uploaded + generated)
│   │   └── settings/
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── chat/
│   │   │   ├── route.ts          # POST: send message (Q&A, document query, generation)
│   │   │   └── [id]/
│   │   │       └── route.ts      # GET: get messages, DELETE: delete session
│   │   ├── documents/
│   │   │   ├── route.ts          # POST: upload document, GET: list library docs
│   │   │   └── [id]/
│   │   │       ├── route.ts      # GET: get document summary
│   │   │       ├── query/
│   │   │       │   └── route.ts  # POST: query document
│   │   │       └── risks/
│   │   │           └── route.ts  # GET: get risk flags
│   │   ├── generate/
│   │   │   └── route.ts          # POST: generate legal document
│   │   └── webhooks/
│   │       └── flutterwave/
│   │           └── route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                       # Base UI components (no business logic)
│   ├── sidebar/                  # Sidebar components
│   │   ├── sidebar.tsx
│   │   ├── new-chat-button.tsx
│   │   ├── search-chat.tsx
│   │   ├── library-nav.tsx
│   │   └── history-list.tsx
│   ├── chat/                     # Chat interface components
│   │   ├── chat-messages.tsx     # Message list
│   │   ├── chat-input.tsx        # Input area
│   │   ├── chat-message.tsx      # Single message bubble
│   │   ├── document-upload.tsx   # Upload document via chat
│   │   ├── document-preview.tsx  # Document preview in chat
│   │   └── generate-form.tsx     # Document generation in chat
│   ├── library/                  # Library page components
│   │   └── document-card.tsx
│   └── shared/                   # Shared layout components (nav, footer, etc.)
├── lib/
│   ├── prisma.ts                 # Prisma client singleton
│   ├── auth.ts                   # NextAuth config
│   ├── cloudinary.ts             # Cloudinary upload helpers
│   ├── email.ts                  # Nodemailer transactional email helpers
│   ├── flutterwave.ts            # Flutterwave payment helpers
│   ├── rag/
│   │   ├── classifier.ts         # Scope classification logic
│   │   ├── extractor.ts          # Text and clause extraction
│   │   ├── embeddings.ts         # Embedding generation and retrieval
│   │   └── generator.ts          # RAG response generation
│   └── validators/
│       ├── document.ts           # Document upload validation
│       └── query.ts              # Query input validation and sanitization
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── types/
│   └── index.ts                  # Shared TypeScript types and enums
├── hooks/                        # Custom React hooks
├── constants/
│   └── errors.ts                 # Error codes E001–E009
└── tokens/
    └── tokens.css                # CSS custom property design tokens
```

---

## 4. Database Schema (Prisma)

Implement this schema in `prisma/schema.prisma` exactly. Do not rename fields, change types, or add fields without updating this file first.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum UserRole {
  free
  pro
  admin
}

enum FileType {
  pdf
  txt
  docx
}

enum DocumentType {
  contract
  nda
  lease
  policy
  service_agreement
  employment
  partnership
  other_legal
}

enum ScopeStatus {
  legal
  non_legal
  unclassified
}

enum ProcessingStatus {
  pending
  processing
  completed
  failed
}

enum ClauseType {
  termination
  confidentiality
  payment
  liability
  indemnity
  dispute_resolution
  intellectual_property
  governing_law
  other
}

enum RiskLevel {
  low
  medium
  high
}

enum RiskCategory {
  unusual_term
  missing_clause
  one_sided_obligation
  vague_language
  auto_renewal
  broad_liability
  ip_transfer
  non_compete
  other
}

enum ScopeClassification {
  in_scope
  out_of_scope
  ambiguous
}

enum ConfidenceLevel {
  high
  medium
  low
  unresolved
}

enum TemplateType {
  nda
  service_agreement
  employment_contract
  lease
  partnership_agreement
}

enum OutputFormat {
  pdf
  docx
}

enum GenerationStatus {
  pending
  completed
  failed
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  displayName  String
  passwordHash String?
  role         UserRole  @default(free)
  createdAt    DateTime  @default(now())
  lastActiveAt DateTime  @updatedAt

  documents          Document[]
  sessions           Session[]
  queryInteractions  QueryInteraction[]
  generatedDocuments GeneratedDocument[]
}

model Document {
  id               String           @id @default(uuid())
  userId           String
  sessionId        String?
  fileName         String
  fileType         FileType
  fileSize         Int
  storageRef       String
  documentType     DocumentType     @default(other_legal)
  scopeStatus      ScopeStatus      @default(unclassified)
  processingStatus ProcessingStatus @default(pending)
  uploadedAt       DateTime         @default(now())
  processedAt      DateTime?
  retentionExpiry  DateTime
  extractedText    String?

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  session   Session?  @relation(fields: [sessionId], references: [id])
  clauses   Clause[]
  riskFlags RiskFlag[]
  queries   QueryInteraction[]
}

model Clause {
  id             String     @id @default(uuid())
  documentId     String
  clauseType     ClauseType @default(other)
  rawText        String
  simplifiedText String?
  pageNumber     Int?
  startIndex     Int
  endIndex       Int
  isFlagged      Boolean    @default(false)
  createdAt      DateTime   @default(now())

  document  Document   @relation(fields: [documentId], references: [id], onDelete: Cascade)
  riskFlags RiskFlag[]
}

model RiskFlag {
  id             String       @id @default(uuid())
  clauseId       String
  documentId     String
  riskLevel      RiskLevel
  riskCategory   RiskCategory
  description    String
  recommendation String
  createdAt      DateTime     @default(now())

  clause   Clause   @relation(fields: [clauseId], references: [id], onDelete: Cascade)
  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
}

model QueryInteraction {
  id                  String              @id @default(uuid())
  sessionId           String
  documentId          String?
  userId              String
  userQuery           String
  scopeClassification ScopeClassification
  retrievedClauses    String[]
  systemResponse      String?
  confidenceLevel     ConfidenceLevel?
  errorCode           String?
  createdAt           DateTime            @default(now())
  responseAt          DateTime?

  session  Session   @relation(fields: [sessionId], references: [id])
  document Document? @relation(fields: [documentId], references: [id])
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Session {
  id             String   @id @default(uuid())
  userId         String
  documentId     String?
  startedAt      DateTime @default(now())
  lastActivityAt DateTime @updatedAt
  isActive       Boolean  @default(true)
  queryCount     Int      @default(0)
  customName     String?

  user              User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  documents         Document[]
  queryInteractions QueryInteraction[]
}

model GeneratedDocument {
  id               String           @id @default(uuid())
  userId           String
  sessionId        String?
  templateType     TemplateType
  inputParameters  Json
  outputFormat     OutputFormat
  storageRef       String?
  generationStatus GenerationStatus  @default(pending)
  createdAt        DateTime         @default(now())
  completedAt      DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 5. Environment Variables

All secrets live in `.env` only. Never hardcode any value from this list.

```env
# Database — Neon
DATABASE_URL=               # Neon pooled connection string (runtime)
DIRECT_URL=                 # Neon direct connection string (migrations)

# Auth — NextAuth
NEXTAUTH_URL=               # Base URL of the app
NEXTAUTH_SECRET=            # Random secret string

# Cloudinary — File Storage
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email — Nodemailer
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=

# Payments — Flutterwave
FLUTTERWAVE_PUBLIC_KEY=
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_WEBHOOK_SECRET=
```

Maintain a `.env.example` file with all keys present but no values filled in. Commit `.env.example`, never `.env`.

---

## 6. Rules Reference

All behavioural, coding standard, and enforcement rules live in `.agent/rules/`. Read the relevant file before starting any task.


---

## 7. Definition of Done

A task is complete only when all of the following are true:

- [ ] TypeScript compiles with zero errors in strict mode
- [ ] The feature matches the behaviour described in the PRD (Sections 5–11)
- [ ] All API routes return the standard response envelope
- [ ] Scope classification runs before any document processing or query response
- [ ] The legal disclaimer appears on all AI-generated responses
- [ ] No Tailwind classes are present anywhere in the codebase
- [ ] All styling uses CSS custom property tokens
- [ ] No secrets or environment variable values are hardcoded
- [ ] Prisma schema matches Section 4 of this file exactly
- [ ] Audit logging is in place for all QueryInteraction, upload, and generation events
- [ ] `retentionExpiry` is set on every Document record at creation time
- [ ] No raw errors, stack traces, or Prisma internals are returned to the client

---

*When in doubt, refer back to this file and the PRD before making any decision.*
