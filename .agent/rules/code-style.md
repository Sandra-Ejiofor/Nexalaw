# code-style.md — Nexalaw

These rules govern how code is written across the entire Nexalaw codebase. They apply to every file — components, API routes, library functions, utility files, and configuration. No exceptions.

---

## 1. TypeScript

### Semicolons
Do not use semicolons in TypeScript or TypeScript React files. The codebase follows a no-semicolon convention.

```typescript
// Correct
const greeting = 'hello'
console.log(greeting)

// Wrong
const greeting = 'hello';
console.log(greeting);
```

### Strict Mode
`tsconfig.json` must always include:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true
  }
}
```

These flags are never relaxed, disabled, or commented out.

### Type Rules
- Never use `any`. If a type is unknown, use `unknown` and narrow it explicitly.
- Never use `// @ts-ignore` or `// @ts-nocheck`.
- Never suppress TypeScript errors with type assertions (`as SomeType`) unless the type is already confirmed safe.
- All Prisma model types are imported from `@prisma/client`. Never redefine them manually.
- All shared custom types and enums live in `types/index.ts`. Do not scatter type definitions across files.
- Every function must have explicit return types — no implicit returns.
- Every API route handler must be fully typed: request body, response shape, and all error states.

```typescript
// Correct
async function getDocument(id: string): Promise<Document | null> { ... }

// Wrong
async function getDocument(id) { ... }
```

### Null Handling
- Always handle `null` and `undefined` explicitly. Do not assume a value exists.
- Use optional chaining (`?.`) and nullish coalescing (`??`) appropriately.
- Never use non-null assertion (`!`) unless the value is guaranteed non-null by context and a comment explains why.

---

## 2. Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files (components) | PascalCase | `DocumentCard.tsx` |
| Files (utilities, hooks, routes) | kebab-case | `use-document.ts`, `route.ts` |
| React components | PascalCase | `DocumentCard` |
| Functions | camelCase | `uploadDocument()` |
| Variables | camelCase | `documentId` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE` |
| TypeScript types | PascalCase | `DocumentResponse` |
| TypeScript enums | PascalCase | `ScopeStatus` |
| Prisma models | PascalCase | `Document`, `RiskFlag` |
| CSS custom properties | kebab-case | `--color-primary` |
| Environment variables | SCREAMING_SNAKE_CASE | `DEEPSEEK_API_KEY` |

### Naming Clarity Rules
- Names must describe what something is or does — not how it works internally.
- Boolean variables and functions must read as true/false questions: `isActive`, `hasExpired`, `isFlagged`.
- Event handler props must be prefixed with `on`: `onUpload`, `onQuerySubmit`.
- Handler function implementations must be prefixed with `handle`: `handleUpload`, `handleQuerySubmit`.

---

## 3. File and Module Structure

### One Responsibility Per File
Each file has one clear responsibility. A file that does two unrelated things must be split.

### Imports Order
Imports must be ordered in this sequence with a blank line between each group:

```typescript
// 1. React and Next.js
import { useState } from 'react'
import { NextRequest, NextResponse } from 'next/server'

// 2. Third-party libraries
import { getServerSession } from 'next-auth'
import { z } from 'zod'

// 3. Internal — absolute imports
import { prisma } from '@/lib/prisma'
import { classifyScope } from '@/lib/rag/classifier'

// 4. Internal — types
import type { DocumentResponse } from '@/types'

// 5. Styles (components only)
import styles from './DocumentCard.module.css'
```

### Barrel Exports
Each major directory (`components/ui/`, `lib/`, `types/`) must have an `index.ts` that re-exports its public interface. Do not import from deep paths when a barrel export exists.

```typescript
// Correct
import { prisma } from '@/lib'

// Wrong
import { prisma } from '@/lib/prisma/client/singleton'
```

---

## 4. React and Next.js Component Rules

### Server Components First
Server Components are the default in the Next.js App Router. Only add `"use client"` when the component genuinely requires:
- Browser APIs (`window`, `document`, `localStorage`)
- Event handlers (`onClick`, `onChange`)
- React state hooks (`useState`, `useReducer`)
- React effect hooks (`useEffect`, `useLayoutEffect`)

If none of these are needed, the component is a Server Component. Do not add `"use client"` preemptively.

### Component Structure
All components are functional with named exports. No class components, ever.

```typescript
// Correct
export function DocumentCard({ document }: DocumentCardProps) { ... }

// Wrong
export default class DocumentCard extends React.Component { ... }
```

### Props
- Every component must have an explicitly typed props interface.
- Props interfaces are named `[ComponentName]Props`.
- Optional props must have a default value or be explicitly handled when undefined.

```typescript
interface DocumentCardProps {
  document: Document
  onSelect?: (id: string) => void
  isHighlighted?: boolean
}
```

### Data Fetching
- Fetch data in Server Components using `async/await` directly.
- Never fetch data inside a Client Component — use Server Components, route handlers, or React Server Actions.
- Never use `useEffect` for data fetching.

### No Inline Styles
No component may use the `style` prop for styling:

```tsx
// Wrong
<div style={{ color: 'red', padding: '16px' }}>

// Correct — use CSS custom properties via className
<div className={styles.errorMessage}>
```

---

## 5. API Route Handler Structure

Every route handler must follow this exact pattern:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { success: false, data: null, errorCode: 'E007', message: 'Unauthorised.' },
        { status: 401 }
      )
    }

    // 2. Parse and validate input
    const body = await request.json()
    // validate with zod schema

    // 3. Run scope classification (where applicable)

    // 4. Execute business logic

    // 5. Return standard envelope
    return NextResponse.json(
      { success: true, data: result, errorCode: null, message: 'Success.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('[route] error:', error)
    return NextResponse.json(
      { success: false, data: null, errorCode: 'E007', message: 'Something went wrong. Please try again later.' },
      { status: 500 }
    )
  }
}
```

### Response Envelope — Always
Every API response uses this exact shape, no exceptions:

```typescript
{
  success: boolean
  data: object | null
  errorCode: string | null
  message: string
}
```

Never return a raw object, plain string, or unstructured error.

---

## 6. Validation

All user input is validated with **Zod** before any business logic runs.

```typescript
import { z } from 'zod'

const uploadDocumentSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.enum([
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
  fileSize: z.number().max(10 * 1024 * 1024), // 10MB
})
```

- Validation schemas live in `lib/validators/`.
- A validation failure returns the standard error envelope with the relevant error code — never a raw Zod error object.
- All text inputs (queries, template parameters, file names) must be sanitized to strip potentially malicious content before being passed to Prisma or DeepSeek.

---

## 7. Error Handling

### In Route Handlers
- Wrap all route logic in `try/catch`.
- Catch blocks log the error server-side (`console.error`) and return E007 to the client.
- Never return raw error messages, stack traces, or Prisma error objects to the client.

### In Library Functions
- Library functions (in `lib/`) throw typed errors — they do not catch them.
- Route handlers are responsible for catching errors from library functions.
- Define a typed error class in `types/index.ts` for application-level errors:

```typescript
export class NexalawError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'NexalawError'
  }
}
```

### Never Swallow Errors
```typescript
// Wrong
try {
  await doSomething()
} catch {
  // silent — never do this
}

// Correct
try {
  await doSomething()
} catch (error) {
  console.error('[context] description:', error)
  throw error // or handle and return appropriate error code
}
```

---

## 8. Comments and Documentation

### When to Comment
- Comment the *why*, not the *what*. Code should be readable enough that what it does is clear.
- Comment any non-obvious business rule, legal constraint, or architectural decision.
- Comment every DeepSeek prompt with the reason the prompt is structured that way.

### JSDoc for Public Functions
Every exported function in `lib/` must have a JSDoc comment:

```typescript
/**
 * Classifies a user query or document as in_scope, ambiguous, or out_of_scope.
 * Applies the benefit-of-the-doubt principle: documents with any legal indicator
 * are classified as ambiguous, not out_of_scope.
 *
 * @param input - The text content to classify
 * @param type - Whether the input is a 'document' or 'query'
 * @returns ScopeClassification
 */
export async function classifyScope(
  input: string,
  type: 'document' | 'query'
): Promise<ScopeClassification> { ... }
```

### No Commented-Out Code
Do not leave commented-out code in the codebase. If code is no longer needed, delete it. Version control (Git) preserves history.

---

## 9. Git and Commit Discipline

### Commit Message Format
Use conventional commits:

```
type(scope): short description

feat(documents): add clause extraction pipeline
fix(api): handle null session in query route
chore(prisma): add retentionExpiry to Document model
docs(rules): update architecture.md with DeepSeek integration
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`

### Never Commit
- `.env` files with real values
- `node_modules/`
- `.next/` build output
- Any file containing API keys or secrets

### Branch Naming
```
feature/document-upload
fix/scope-classifier-null-handling
chore/prisma-schema-update
```

---

## 10. Constants

All magic values — file size limits, retention periods, error codes, timeout durations — must be defined as named constants in `constants/`. Never use magic numbers inline.

```typescript
// constants/document.ts
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  // 10MB
export const RETENTION_DAYS = 30
export const EXPIRY_WARNING_DAYS = 7
export const DEEPSEEK_TIMEOUT_MS = 30_000

// constants/errors.ts
export const ERROR_CODES = {
  E001: 'Please upload a document to continue.',
  E002: "We couldn't process this document. Please upload a valid PDF or text-based file.",
  E003: 'This question depends on the specific document. Please upload the relevant document.',
  E004: 'No matching section was found in this document.',
  E005: 'This section is unclear. You may want to review the original text or consult a legal professional.',
  E006: 'This file format is not supported. Please upload a PDF or plain text document.',
  E007: 'Something went wrong. Please try again later.',
  E008: 'This assistant only handles legal documents and legal questions.',
  E009: 'This document does not appear to be a legal document.',
} as const

export type ErrorCode = keyof typeof ERROR_CODES
```
