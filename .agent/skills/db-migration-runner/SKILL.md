# SKILL.md — Database Migration Runner
### Nexalaw · Prisma ORM · Neon PostgreSQL · TypeScript Strict

---

## Purpose

This skill governs every database operation in Nexalaw — schema changes, migrations, seeding, and the Prisma client singleton. Use it whenever you are modifying `prisma/schema.prisma`, running migrations, writing seed data, or working with the Prisma client in `lib/prisma.ts`. A mistake at the database layer can corrupt data, break the entire application, or cause production downtime. Follow every step in this skill exactly.

---

## Pre-Flight Checklist

Before touching the schema or running any Prisma command, confirm all of the following:

- [ ] Both `DATABASE_URL` and `DIRECT_URL` are set in `.env`
- [ ] `DATABASE_URL` is the **pooled** Neon connection string
- [ ] `DIRECT_URL` is the **direct** Neon connection string
- [ ] I am not about to run a migration using the pooled URL (this will fail or cause errors)
- [ ] I have read `.agent/rules/database.md` for full database rules
- [ ] I understand what the schema change does and which models it affects
- [ ] If dropping a field or table — I have verified no active code references it

---

## 1. The Dual URL Rule

Neon provides two connection strings. They are not interchangeable.

| URL | Variable | Use For | Never Use For |
|-----|----------|---------|---------------|
| Pooled | `DATABASE_URL` | Runtime queries (Prisma Client in app code) | Migrations |
| Direct | `DIRECT_URL` | Migrations only (`prisma migrate`, `prisma db push`) | Runtime queries |

The pooled URL routes through PgBouncer — it cannot run the DDL statements that migrations require. Always use `DIRECT_URL` for all migration commands.

```prisma
// prisma/schema.prisma — this is the only correct datasource configuration
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled — runtime
  directUrl = env("DIRECT_URL")     // direct — migrations
}
```

Do not change this. Do not remove `directUrl`. Do not swap the values.

---

## 2. Prisma Client Singleton

The Prisma Client must be instantiated as a singleton. In a Vercel serverless environment, each function invocation can spin up a new Node.js process. Without the singleton pattern, each process creates a new database connection — which will exhaust Neon's connection limits quickly.

```typescript
// lib/prisma.ts — the only place PrismaClient is instantiated
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

**Rules:**
- Never call `new PrismaClient()` anywhere except `lib/prisma.ts`
- Always import `prisma` from `@/lib/prisma` — never from a local path
- Never disconnect the Prisma client manually (`prisma.$disconnect()`) in route handlers — let the connection pool manage lifecycle

---

## 3. Migration Workflow

Follow these steps in order for every schema change. Never skip a step.

### Step 1 — Modify the Schema
Edit `prisma/schema.prisma` only. Make the minimum change needed. If adding a field, decide on nullable vs required and set a sensible default.

```prisma
// Adding a new optional field to Document
model Document {
  // ... existing fields
  confidenceOverride  ConfidenceLevel?  // nullable — not required at creation
}
```

### Step 2 — Validate the Schema
```bash
npx prisma validate
```
Fix any errors before proceeding. A schema that does not validate will not migrate.

### Step 3 — Generate the Migration (Development)
```bash
npx prisma migrate dev --name describe-what-changed
```

This command:
- Uses `DIRECT_URL` for the actual migration (because it is set in `schema.prisma`)
- Creates a new migration file in `prisma/migrations/`
- Runs the migration against your development database
- Regenerates the Prisma Client

**Naming conventions for migrations:**
```
add_confidence_override_to_document
add_risk_flag_table
rename_storage_ref_to_cloudinary_id
add_retention_expiry_index
drop_unused_session_field
```

Always: verb + noun + context. Never: `update1`, `fix`, `changes`, `migration`.

### Step 4 — Regenerate the Prisma Client
If `migrate dev` did not automatically regenerate the client, run:
```bash
npx prisma generate
```

### Step 5 — Verify in Development
Confirm the migration ran correctly:
```bash
npx prisma studio
```
Inspect the affected tables. Verify the new field or table is present and correctly typed.

### Step 6 — Deploy to Production (Vercel / Neon)
In production, never use `migrate dev`. Use:
```bash
npx prisma migrate deploy
```

This applies all pending migrations in `prisma/migrations/` to the production database. It does not generate new migrations — only applies existing ones.

Add this to your Vercel build command so migrations run automatically on each deployment:
```
npx prisma migrate deploy && npx prisma generate && next build
```

---

## 4. Schema Change Patterns

### Adding a Required Field to an Existing Model

**Problem:** Adding a non-nullable field to a table that already has rows will fail — existing rows have no value for the new field.

**Solution:** Always add with a default value, or add as nullable first, then backfill, then add the constraint.

```prisma
// Safe: add with a default
model Document {
  newField  String  @default("default_value")
}

// Safe: add as nullable, backfill later
model Document {
  newField  String?
}

// Unsafe: adding required field with no default on a populated table
model Document {
  newField  String   // ← will fail if table has existing rows
}
```

### Adding a New Model

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  userId     String
  action     String
  documentId String?
  errorCode  String?
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Add the relation on the User model too
model User {
  // ... existing fields
  auditLogs  AuditLog[]
}
```

After adding a new model, always run `npx prisma validate` before migrating.

### Renaming a Field

Prisma does not have a native rename operation. To rename a field safely:

1. Add the new field (nullable)
2. Write a migration script to copy values from old field to new field
3. Remove the old field in a second migration
4. Make the new field required if needed

```sql
-- In a custom migration file:
UPDATE "Document" SET "newFieldName" = "oldFieldName";
```

Never rename by editing the field name directly and running `migrate dev` — Prisma will drop the old column and create a new one, losing all data.

### Adding an Index

Add indexes for fields that are frequently queried in `WHERE` clauses:

```prisma
model Document {
  userId          String
  retentionExpiry DateTime

  @@index([userId])                         // queries filtered by owner
  @@index([retentionExpiry])                // cron job queries
  @@index([userId, processingStatus])       // dashboard queries
}
```

---

## 5. Nexalaw Schema — Required Indexes

The following indexes must be present on the schema. Add them if missing:

```prisma
model Document {
  @@index([userId])
  @@index([retentionExpiry])
  @@index([userId, processingStatus])
}

model Clause {
  @@index([documentId])
  @@index([documentId, clauseType])
}

model RiskFlag {
  @@index([documentId])
  @@index([documentId, riskLevel])
}

model QueryInteraction {
  @@index([userId])
  @@index([sessionId])
  @@index([documentId])
}

model Session {
  @@index([userId])
  @@index([userId, isActive])
}
```

---

## 6. Seeding

The seed file lives at `prisma/seed.ts`. Run it with:

```bash
npx prisma db seed
```

Configure in `package.json`:
```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

### Seed File Pattern

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Seed an admin user for development
  const hashedPassword = await bcrypt.hash('dev-password-change-me', 12)

  await prisma.user.upsert({
    where: { email: 'admin@nexalaw.dev' },
    update: {},
    create: {
      email: 'admin@nexalaw.dev',
      displayName: 'Nexalaw Admin',
      passwordHash: hashedPassword,
      role: 'admin',
    },
  })

  console.log('Seed completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

**Seed rules:**
- Use `upsert` — never `create` alone in seeds (idempotent)
- Never seed real user data or real documents
- Never seed with production credentials
- The seed file is the only place where `prisma.$disconnect()` is acceptable

---

## 7. Querying Safely with Prisma

### Always Scope to the Authenticated User

```typescript
// Correct — ownership enforced at query level
const document = await prisma.document.findFirst({
  where: {
    id: documentId,
    userId: session.user.id,  // ownership check — mandatory
  },
  include: {
    clauses: true,
    riskFlags: true,
  },
})

// Wrong — no ownership check
const document = await prisma.document.findUnique({
  where: { id: documentId },
})
```

### Select Only What You Need

```typescript
// Correct — select only needed fields
const documents = await prisma.document.findMany({
  where: { userId: session.user.id },
  select: {
    id: true,
    fileName: true,
    processingStatus: true,
    uploadedAt: true,
    retentionExpiry: true,
    // extractedText is excluded — large field, not needed in list view
  },
  orderBy: { uploadedAt: 'desc' },
})

// Wrong — select everything including large fields
const documents = await prisma.document.findMany({
  where: { userId: session.user.id },
})
```

### Transactions for Multi-Step Writes

When multiple writes must succeed or fail together, use a transaction:

```typescript
// Creating a document with its initial session in one transaction
const [document, session] = await prisma.$transaction([
  prisma.document.create({
    data: {
      userId: session.user.id,
      fileName: file.name,
      // ... other fields
    },
  }),
  prisma.session.create({
    data: {
      userId: session.user.id,
      isActive: true,
    },
  }),
])
```

### Pagination for List Queries

Never fetch unbounded lists. Always paginate:

```typescript
const PAGE_SIZE = 20

const documents = await prisma.document.findMany({
  where: { userId: session.user.id },
  take: PAGE_SIZE,
  skip: page * PAGE_SIZE,
  orderBy: { uploadedAt: 'desc' },
})
```

---

## 8. Dangerous Operations — Full Protocol

These operations can cause data loss. Follow the full protocol before executing any of them.

| Operation | Risk | Protocol |
|-----------|------|----------|
| `prisma migrate reset` | Drops and recreates entire database | Development only — never in production |
| `prisma db push` | Applies schema without a migration file | Prototyping only — never use without creating a migration |
| Dropping a column | Permanent data loss | Verify no code references it; add deprecation comment first; test in staging |
| Dropping a table | Permanent data loss | Full backup required; verify all relations; test in staging first |
| Changing a field type | May corrupt data | Always add new field, migrate data, remove old field |
| `prisma migrate deploy` in production | Applies all pending migrations | Ensure all migration files are tested in staging first |

**Never run `prisma migrate reset` in production. Ever.**

---

## 9. Migration Definition of Done

A database change is complete only when:

- [ ] `prisma/schema.prisma` matches AGENTS.md Section 4 plus the new change
- [ ] `npx prisma validate` passes with zero errors
- [ ] Migration file is in `prisma/migrations/` with a descriptive name
- [ ] `npx prisma generate` has been run — Prisma Client is up to date
- [ ] All required indexes are present (Section 5 of this skill)
- [ ] New required fields have default values or are nullable for existing row safety
- [ ] No rename operations were done by editing field names directly
- [ ] Seed file updated if the change affects seedable data
- [ ] TypeScript compiles with zero errors after client regeneration — no type mismatches
- [ ] Verified in Prisma Studio that schema reflects the intended change
- [ ] `prisma migrate deploy` added to Vercel build command if not already present
