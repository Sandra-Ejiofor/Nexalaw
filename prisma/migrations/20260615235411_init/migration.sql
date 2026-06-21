-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('free', 'pro', 'admin');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('pdf', 'txt', 'docx');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('contract', 'nda', 'lease', 'policy', 'service_agreement', 'employment', 'partnership', 'other_legal');

-- CreateEnum
CREATE TYPE "ScopeStatus" AS ENUM ('legal', 'non_legal', 'unclassified');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "ClauseType" AS ENUM ('termination', 'confidentiality', 'payment', 'liability', 'indemnity', 'dispute_resolution', 'intellectual_property', 'governing_law', 'other');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('unusual_term', 'missing_clause', 'one_sided_obligation', 'vague_language', 'auto_renewal', 'broad_liability', 'ip_transfer', 'non_compete', 'other');

-- CreateEnum
CREATE TYPE "ScopeClassification" AS ENUM ('in_scope', 'out_of_scope', 'ambiguous');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('high', 'medium', 'low', 'unresolved');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('nda', 'service_agreement', 'employment_contract', 'lease', 'partnership_agreement');

-- CreateEnum
CREATE TYPE "OutputFormat" AS ENUM ('pdf', 'docx');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" "FileType" NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageRef" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'other_legal',
    "scopeStatus" "ScopeStatus" NOT NULL DEFAULT 'unclassified',
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'pending',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "retentionExpiry" TIMESTAMP(3) NOT NULL,
    "extractedText" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clause" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "clauseType" "ClauseType" NOT NULL DEFAULT 'other',
    "rawText" TEXT NOT NULL,
    "simplifiedText" TEXT,
    "pageNumber" INTEGER,
    "startIndex" INTEGER NOT NULL,
    "endIndex" INTEGER NOT NULL,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskFlag" (
    "id" TEXT NOT NULL,
    "clauseId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "riskCategory" "RiskCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueryInteraction" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "documentId" TEXT,
    "userId" TEXT NOT NULL,
    "userQuery" TEXT NOT NULL,
    "scopeClassification" "ScopeClassification" NOT NULL,
    "retrievedClauses" TEXT[],
    "systemResponse" TEXT,
    "confidenceLevel" "ConfidenceLevel",
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseAt" TIMESTAMP(3),

    CONSTRAINT "QueryInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "queryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "templateType" "TemplateType" NOT NULL,
    "inputParameters" JSONB NOT NULL,
    "outputFormat" "OutputFormat" NOT NULL,
    "storageRef" TEXT,
    "generationStatus" "GenerationStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clause" ADD CONSTRAINT "Clause_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskFlag" ADD CONSTRAINT "RiskFlag_clauseId_fkey" FOREIGN KEY ("clauseId") REFERENCES "Clause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskFlag" ADD CONSTRAINT "RiskFlag_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryInteraction" ADD CONSTRAINT "QueryInteraction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryInteraction" ADD CONSTRAINT "QueryInteraction_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryInteraction" ADD CONSTRAINT "QueryInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
