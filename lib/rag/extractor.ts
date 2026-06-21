import { prisma } from '@/lib/prisma'
import { NexalawError } from '@/types'
import type { ClauseType, RiskLevel, RiskCategory } from '@prisma/client'
// @ts-expect-error pdf-parse v1 has no types for subpath import
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'

// Clause type patterns — used to classify extracted clauses
const CLAUSE_PATTERNS: Array<{ type: ClauseType; patterns: RegExp[] }> = [
  {
    type: 'termination',
    patterns: [/terminat/i, /cancel/i, /end\s+of\s+agreement/i, /expir/i],
  },
  {
    type: 'confidentiality',
    patterns: [/confidential/i, /non-disclosure/i, /nda/i, /proprietary/i, /secret/i],
  },
  {
    type: 'payment',
    patterns: [/payment/i, /compensat/i, /fee/i, /invoice/i, /reimburs/i, /salary/i],
  },
  {
    type: 'liability',
    patterns: [/liabilit/i, /limitation\s+of/i, /damages/i, /negligence/i],
  },
  {
    type: 'indemnity',
    patterns: [/indemnif/i, /hold\s+harmless/i, /defend/i],
  },
  {
    type: 'dispute_resolution',
    patterns: [/dispute/i, /arbitrat/i, /mediat/i, /litigation/i, /court/i],
  },
  {
    type: 'intellectual_property',
    patterns: [/intellectual\s+property/i, /copyright/i, /trademark/i, /patent/i, /ip\s+rights/i],
  },
  {
    type: 'governing_law',
    patterns: [/governing\s+law/i, /jurisdiction/i, /applicable\s+law/i, /venue/i],
  },
]

// Risk patterns — used to flag potentially problematic clauses
const RISK_PATTERNS: Array<{
  category: RiskCategory
  level: RiskLevel
  patterns: RegExp[]
  description: string
  recommendation: string
}> = [
  {
    category: 'auto_renewal',
    level: 'medium',
    patterns: [/auto(matic(ally)?)?[\s-]*renew/i, /shall\s+renew\s+automatically/i],
    description: 'This clause includes an automatic renewal provision.',
    recommendation: 'Review the renewal terms carefully. Note any deadlines for opting out.',
  },
  {
    category: 'broad_liability',
    level: 'high',
    patterns: [/unlimited\s+liabilit/i, /all\s+damages/i, /any\s+and\s+all\s+claims/i],
    description: 'This clause contains broad or unlimited liability language.',
    recommendation: 'Consider negotiating a liability cap or limitation clause.',
  },
  {
    category: 'one_sided_obligation',
    level: 'high',
    patterns: [/sole\s+discretion/i, /without\s+(prior\s+)?notice/i, /at\s+any\s+time\s+without/i],
    description: 'This clause grants one-sided discretion to one party.',
    recommendation: 'Ensure both parties have balanced rights and obligations.',
  },
  {
    category: 'ip_transfer',
    level: 'high',
    patterns: [/assign(s)?\s+(all|any)\s+.*(right|ip|intellectual)/i, /work\s+for\s+hire/i],
    description: 'This clause may transfer intellectual property rights.',
    recommendation: 'Review carefully to understand what IP rights are being transferred.',
  },
  {
    category: 'non_compete',
    level: 'medium',
    patterns: [/non-?compete/i, /restrictive\s+covenant/i, /not\s+engage\s+in\s+competing/i],
    description: 'This clause contains a non-compete restriction.',
    recommendation: 'Check the scope, duration, and geographic area of the restriction.',
  },
  {
    category: 'vague_language',
    level: 'low',
    patterns: [/reasonable\s+efforts/i, /as\s+needed/i, /from\s+time\s+to\s+time/i, /as\s+appropriate/i],
    description: 'This clause contains vague or undefined language.',
    recommendation: 'Consider requesting clearer, more specific terms.',
  },
]

/**
 * Extracts text from a document file buffer.
 * Uses pdf-parse for PDFs, mammoth for DOCX, native UTF-8 for TXT.
 *
 * @param fileBuffer - The raw file contents
 * @param fileType - The MIME type of the file
 * @returns The extracted text content
 */
export async function extractText(
  fileBuffer: Buffer,
  fileType: string
): Promise<string> {
  switch (fileType) {
    case 'text/plain':
      return fileBuffer.toString('utf-8')

    case 'application/pdf': {
      try {
        const data = await pdfParse(fileBuffer)
        return data.text
      } catch (error) {
        console.error('[extractor] PDF parse error:', error)
        throw new NexalawError('E002', 'Could not read this PDF. It may be scanned or image-based.')
      }
    }

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      try {
        const result = await mammoth.extractRawText({ buffer: fileBuffer })
        return result.value
      } catch (error) {
        console.error('[extractor] DOCX parse error:', error)
        throw new NexalawError('E002', 'Could not read this DOCX file.')
      }
    }

    default:
      throw new NexalawError('E006', 'Unsupported file format')
  }
}

/**
 * Splits extracted text into clause segments based on section breaks,
 * numbered headings, and paragraph boundaries.
 */
function splitIntoClauses(text: string): Array<{ text: string; startIndex: number; endIndex: number }> {
  const clauses: Array<{ text: string; startIndex: number; endIndex: number }> = []

  // Split on section patterns: numbered sections, article headings, double newlines
  const sectionPattern = /(?=(?:\n\s*\d+[\.\)]\s)|(?:\n\s*(?:Section|Article|Clause)\s+\d+)|(?:\n\n+))/gi
  const segments = text.split(sectionPattern).filter(s => s.trim().length > 50)

  let currentIndex = 0
  for (const segment of segments) {
    const trimmed = segment.trim()
    if (trimmed.length > 50) {
      const startIndex = text.indexOf(trimmed, currentIndex)
      clauses.push({
        text: trimmed,
        startIndex: startIndex >= 0 ? startIndex : currentIndex,
        endIndex: (startIndex >= 0 ? startIndex : currentIndex) + trimmed.length,
      })
      currentIndex = (startIndex >= 0 ? startIndex : currentIndex) + trimmed.length
    }
  }

  // If no sections found, treat the whole text as one clause
  if (clauses.length === 0 && text.trim().length > 0) {
    clauses.push({
      text: text.trim(),
      startIndex: 0,
      endIndex: text.length,
    })
  }

  return clauses
}

/**
 * Classifies a clause segment by matching against known clause type patterns.
 */
function classifyClauseType(text: string): ClauseType {
  for (const { type, patterns } of CLAUSE_PATTERNS) {
    if (patterns.some(pattern => pattern.test(text))) {
      return type
    }
  }
  return 'other'
}

/**
 * Evaluates a clause against known risk patterns and returns any detected risks.
 */
function detectRisks(text: string): Array<{
  category: RiskCategory
  level: RiskLevel
  description: string
  recommendation: string
}> {
  const risks: Array<{
    category: RiskCategory
    level: RiskLevel
    description: string
    recommendation: string
  }> = []

  for (const riskPattern of RISK_PATTERNS) {
    if (riskPattern.patterns.some(pattern => pattern.test(text))) {
      risks.push({
        category: riskPattern.category,
        level: riskPattern.level,
        description: riskPattern.description,
        recommendation: riskPattern.recommendation,
      })
    }
  }

  return risks
}

/**
 * Processes a document: extracts text, identifies clauses, classifies them,
 * evaluates risks, and stores all records in the database.
 * Updates Document.processingStatus throughout the pipeline.
 *
 * @param documentId - The ID of the document to process
 * @param fileBuffer - The raw file contents
 * @param fileType - The MIME type of the file
 */
export async function processDocument(
  documentId: string,
  fileBuffer: Buffer,
  fileType: string
): Promise<void> {
  // Mark as processing
  await prisma.document.update({
    where: { id: documentId },
    data: { processingStatus: 'processing' },
  })

  try {
    // Step 1: Extract text
    const extractedText = await extractText(fileBuffer, fileType)

    // Step 2: Split into clause segments
    const clauseSegments = splitIntoClauses(extractedText)

    // Step 3: Classify and store each clause, evaluating risks
    for (const segment of clauseSegments) {
      const clauseType = classifyClauseType(segment.text)
      const risks = detectRisks(segment.text)

      const clause = await prisma.clause.create({
        data: {
          documentId,
          clauseType,
          rawText: segment.text,
          startIndex: segment.startIndex,
          endIndex: segment.endIndex,
          isFlagged: risks.length > 0,
        },
      })

      // Create risk flag records for detected risks
      for (const risk of risks) {
        await prisma.riskFlag.create({
          data: {
            clauseId: clause.id,
            documentId,
            riskLevel: risk.level,
            riskCategory: risk.category,
            description: risk.description,
            recommendation: risk.recommendation,
          },
        })
      }
    }

    // Step 4: Mark as completed
    await prisma.document.update({
      where: { id: documentId },
      data: {
        processingStatus: 'completed',
        extractedText,
        processedAt: new Date(),
      },
    })
  } catch (error) {
    // Mark as failed on any error
    await prisma.document.update({
      where: { id: documentId },
      data: { processingStatus: 'failed' },
    })
    throw error
  }
}
