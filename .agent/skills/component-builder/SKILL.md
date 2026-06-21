# SKILL.md — Component Builder
### Nexalaw · Next.js 14 · TypeScript Strict · CSS Modules

---

## Purpose

This skill governs how every React component in Nexalaw is built. Use it whenever you are creating or modifying any file inside `components/`. It covers file structure, typing, styling, state, accessibility, and Nexalaw-specific patterns such as confidence level indicators, risk flag badges, and the legal disclaimer block.

---

## Pre-Flight Checklist

Before writing a single line of component code, confirm all of the following:

- [ ] I know which `components/` subdirectory this component belongs to (`ui/`, `documents/`, `query/`, `generate/`, or `shared/`)
- [ ] I know whether this is a Server Component or Client Component
- [ ] I have read `.agent/rules/design-system.md` — no Tailwind, CSS Modules only, tokens only
- [ ] I have read `.agent/rules/code-style.md` — strict TypeScript, named exports, no inline styles
- [ ] I know what props this component receives and their types
- [ ] I know what states this component must handle (loading, error, empty, success)

---

## 1. Component Directory Map

Place every component in the correct subdirectory. Do not create components outside `components/`.

```
components/
├── ui/              # Stateless, reusable base components — Button, Badge, Input, Modal, Spinner, Card
├── documents/       # Document-specific — DocumentCard, DocumentList, ClauseCard, RiskFlagBadge, DocumentUploader
├── query/           # Q&A interface — QueryInput, QueryResponse, ConfidenceBadge, DisclaimerBlock, ConversationThread
├── generate/        # Template generation — GenerateForm, TemplateSelector, GeneratedDocumentCard
└── shared/          # App-wide layout — Navbar, Sidebar, Footer, PageHeader, NotificationBanner
```

**Rule:** A component in `ui/` has zero business logic and zero Nexalaw-specific knowledge. A `Button` does not know what a `Document` is. Business logic lives in `documents/`, `query/`, and `generate/`.

---

## 2. File Structure Per Component

Every component gets exactly two files — no more, no less:

```
components/documents/
├── DocumentCard.tsx         # Component logic
└── DocumentCard.module.css  # Component styles
```

### Component File Template

```tsx
// components/[subdirectory]/ComponentName.tsx

import styles from './ComponentName.module.css'
// Other imports follow code-style.md import order

interface ComponentNameProps {
  // All props explicitly typed — no implicit any
  // Optional props marked with ?
  // Callbacks prefixed with on
}

export function ComponentName({ prop1, prop2, onAction }: ComponentNameProps) {
  // Implementation
  return (
    <div className={styles.container}>
      {/* markup */}
    </div>
  )
}
```

### CSS Module File Template

```css
/* components/[subdirectory]/ComponentName.module.css */

.container {
  /* Use CSS custom properties only — never hardcode values */
  padding: var(--space-4);
  background-color: var(--color-surface);
  border-radius: 0;
}
```

---

## 3. Server Component vs Client Component Decision

Default to Server Component. Only add `"use client"` if the component needs one of these:

| Needs | Use Client? |
|-------|-------------|
| `onClick`, `onChange`, `onSubmit` | Yes |
| `useState`, `useReducer` | Yes |
| `useEffect`, `useLayoutEffect` | Yes |
| Browser APIs (`window`, `document`) | Yes |
| Custom hooks that use the above | Yes |
| Data display only, no interaction | **No** |
| Reads props and renders JSX | **No** |
| Uses `async/await` for data fetching | **No** |

**`"use client"` goes on line 1** of the file, before all imports.

---

## 4. Props Rules

```tsx
// Every component has a named props interface
interface DocumentCardProps {
  document: Document                          // Prisma type from @prisma/client
  isHighlighted?: boolean                     // Optional — has sensible default
  onSelect: (id: string) => void              // Required callback — prefixed with on
  onDelete?: (id: string) => void             // Optional callback
}

// Destructure with defaults for optional props
export function DocumentCard({
  document,
  isHighlighted = false,
  onSelect,
  onDelete,
}: DocumentCardProps) { ... }
```

**Rules:**
- Props interface is always named `[ComponentName]Props`
- Never use `React.FC` — write function signatures directly
- Never spread unknown props (`{...rest}`) onto DOM elements without explicit typing
- Event handler props are prefixed with `on`; their implementations with `handle`

---

## 5. Nexalaw-Specific Component Patterns

### 5.1 ConfidenceBadge

Every AI response carries a `confidenceLevel`. This component must render it visually.

```tsx
// components/query/ConfidenceBadge.tsx
import type { ConfidenceLevel } from '@prisma/client'
import styles from './ConfidenceBadge.module.css'

interface ConfidenceBadgeProps {
  level: ConfidenceLevel
}

export function ConfidenceBadge({ level }: ConfidenceBadgeProps) {
  const labelMap: Record<ConfidenceLevel, string> = {
    high:       'High confidence',
    medium:     'Medium confidence',
    low:        'Low confidence — review recommended',
    unresolved: 'Unable to determine',
  }

  return (
    <span className={`${styles.badge} ${styles[level]}`}>
      {labelMap[level]}
    </span>
  )
}
```

```css
/* ConfidenceBadge.module.css */
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  border-radius: 0;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.high       { color: var(--color-success); background: var(--color-success-surface); }
.medium     { color: var(--color-warning); background: var(--color-warning-surface); }
.low        { color: var(--color-error);   background: var(--color-error-surface);   }
.unresolved { color: var(--color-text-secondary); background: var(--color-surface-raised); }
```

---

### 5.2 RiskFlagBadge

Risk flags surfaced from the `RiskFlag` schema must use risk-level tokens.

```tsx
// components/documents/RiskFlagBadge.tsx
import type { RiskLevel } from '@prisma/client'
import styles from './RiskFlagBadge.module.css'

interface RiskFlagBadgeProps {
  level: RiskLevel
  category: string        // human-readable category label
  description: string
}

export function RiskFlagBadge({ level, category, description }: RiskFlagBadgeProps) {
  return (
    <div className={`${styles.flag} ${styles[level]}`}>
      <span className={styles.level}>{level.toUpperCase()}</span>
      <span className={styles.category}>{category}</span>
      <p className={styles.description}>{description}</p>
    </div>
  )
}
```

```css
/* RiskFlagBadge.module.css */
.flag {
  padding: var(--space-3) var(--space-4);
  border-radius: 0;
  border-left: 4px solid;
}

.low    { background: var(--color-risk-low-surface);    border-color: var(--color-risk-low); }
.medium { background: var(--color-risk-medium-surface); border-color: var(--color-risk-medium); }
.high   { background: var(--color-risk-high-surface);   border-color: var(--color-risk-high); }

.level       { font-size: var(--text-xs); font-weight: var(--font-bold); letter-spacing: 0.05em; }
.category    { font-size: var(--text-sm); font-weight: var(--font-semibold); margin-left: var(--space-2); }
.description { font-size: var(--text-sm); color: var(--color-text-primary); margin-top: var(--space-1); }
```

---

### 5.3 DisclaimerBlock

This component is mandatory on every AI-generated response. It must never be omitted.

```tsx
// components/query/DisclaimerBlock.tsx
import styles from './DisclaimerBlock.module.css'

export function DisclaimerBlock() {
  return (
    <p className={styles.disclaimer} role="note" aria-label="Legal disclaimer">
      This is an educational and legal literacy tool. It does not constitute legal
      advice. Consult a qualified legal professional for legal decisions.
    </p>
  )
}
```

```css
/* DisclaimerBlock.module.css */
.disclaimer {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  border-top: 1px solid var(--color-border-subtle);
  padding-top: var(--space-2);
  margin-top: var(--space-3);
}
```

**Rule:** `DisclaimerBlock` is always rendered below `QueryResponse`. It is never conditional.

---

### 5.4 DocumentUploader

The upload component must handle all states and validation feedback.

```tsx
// components/documents/DocumentUploader.tsx
'use client'

import { useState } from 'react'
import { MAX_FILE_SIZE_BYTES } from '@/constants/document'
import { ERROR_CODES } from '@/constants/errors'
import styles from './DocumentUploader.module.css'

interface DocumentUploaderProps {
  onUploadSuccess: (documentId: string) => void
  onUploadError: (errorCode: string) => void
}

export function DocumentUploader({ onUploadSuccess, onUploadError }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ACCEPTED_TYPES = ['application/pdf', 'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

  async function handleFileSelect(file: File) {
    setError(null)

    // Client-side validation before hitting the server
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(ERROR_CODES.E006)
      onUploadError('E006')
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('File exceeds the 10MB limit. Please upload a smaller file.')
      onUploadError('E002')
      return
    }

    // Proceed to POST /api/documents
    setIsUploading(true)
    // ... upload logic
  }

  return (
    <div
      className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFileSelect(file)
      }}
      role="region"
      aria-label="Document upload area"
    >
      {/* Upload UI */}
      {error && (
        <p className={styles.error} role="alert" aria-live="assertive">
          {error}
        </p>
      )}
    </div>
  )
}
```

---

## 6. Loading, Error, and Empty States

Every component that displays async data must handle all four states. Never render nothing while data loads.

```tsx
// Pattern for async data components
export function DocumentList({ documents, isLoading, error }: DocumentListProps) {
  if (isLoading) return <DocumentListSkeleton />
  if (error)     return <ErrorMessage code={error.code} message={error.message} />
  if (documents.length === 0) return <EmptyState message="No documents uploaded yet." />

  return (
    <ul className={styles.list}>
      {documents.map((doc) => (
        <li key={doc.id}>
          <DocumentCard document={doc} onSelect={handleSelect} />
        </li>
      ))}
    </ul>
  )
}
```

---

## 7. Accessibility Requirements

Every component must satisfy these before it is considered done:

- **Focus ring:** All interactive elements must have a visible focus ring using `var(--color-primary)`. Never `outline: none` without a replacement.
- **Semantic HTML:** Use the correct element for the job — `<button>` for actions, `<a>` for navigation, `<ul>/<li>` for lists, `<article>` for document cards.
- **ARIA labels:** Icon-only buttons must have `aria-label`. Loading states must use `aria-busy="true"`. Error messages must use `role="alert"` and `aria-live="assertive"`.
- **Form labels:** Every `<input>`, `<select>`, and `<textarea>` must have an associated `<label>` via `htmlFor`. Never use placeholder text as a substitute for a label.
- **Colour contrast:** Text must meet 4.5:1 contrast ratio against its background using the design token colours.
- **Keyboard navigation:** All interactive elements are reachable and operable via keyboard alone.

---

## 8. Component Definition of Done

A component is complete only when:

- [ ] File is in the correct `components/` subdirectory
- [ ] Props interface is explicitly typed with no `any`
- [ ] `"use client"` is present only if genuinely required
- [ ] All styles are in the co-located `.module.css` file — no inline styles, no Tailwind
- [ ] All CSS values reference design tokens — no hardcoded hex, px, or font names
- [ ] All four states handled: loading, error, empty, success
- [ ] Focus ring is visible on all interactive elements
- [ ] ARIA attributes are present where required
- [ ] `DisclaimerBlock` is rendered on any component displaying AI responses
- [ ] `ConfidenceBadge` is rendered on any component displaying `confidenceLevel`
- [ ] `RiskFlagBadge` is rendered on any component displaying `RiskFlag` data
- [ ] TypeScript compiles with zero errors in strict mode
