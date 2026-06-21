import type { ScopeClassificationResult } from '@/types'

// Legal terminology indicators used for benefit-of-the-doubt classification
// Includes full terms and common abbreviations
const LEGAL_KEYWORDS = [
  'agreement', 'contract', 'clause', 'party', 'parties', 'shall',
  'herein', 'indemnify', 'whereas', 'pursuant', 'obligations',
  'termination', 'confidentiality', 'liability', 'governing law',
  'jurisdiction', 'arbitration', 'dispute', 'breach', 'warranty',
  'representation', 'covenant', 'lien', 'encumbrance', 'force majeure',
  'non-disclosure', 'nda', 'intellectual property', 'ip',
  'severability', 'amendment', 'waiver', 'assignment', 'notice',
  'execution', 'binding', 'enforceable', 'signatory', 'witness',
  'notarize', 'tenant', 'landlord', 'lessee', 'lessor', 'licensee',
  'licensor', 'employer', 'employee', 'compensation', 'non-compete',
  'indemnification', 'hold harmless', 'liquidated damages',
  'entire agreement', 'effective date', 'term of agreement',
  'eula', 'tos', 'terms of service', 'privacy policy',
  'gdpr', 'hipaa', 'data protection', 'solicitor', 'attorney',
  'litigation', 'settlement', 'hearing', 'tribunal',
  'power of attorney', 'poa', 'llc', 'incorporation',
  'dividend', 'equity', 'shareholder', 'fiduciary', 'trust',
  'deed', 'title', 'ownership', 'easement', 'zoning',
  'bankruptcy', 'insolvency', 'creditor', 'debtor',
  'copyright', 'trademark', 'patent', 'royalty', 'licensing',
  'collateral', 'mortgage', 'promissory', 'default',
  'statute', 'regulation', 'compliance', 'legislation',
  'penalty', 'fine', 'sanction', 'audit',
]

// Structural indicators of legal documents
const LEGAL_STRUCTURE_PATTERNS = [
  /section\s+\d+/i,
  /article\s+\d+/i,
  /clause\s+\d+/i,
  /\d+\.\d+/,                          // numbered sections like 3.1
  /schedule\s+[a-z]/i,                 // schedule references
  /exhibit\s+[a-z]/i,                  // exhibit references
  /in\s+witness\s+whereof/i,           // signature block language
  /executed\s+as\s+of/i,               // execution language
  /by\s+and\s+between/i,              // party definitions
  /terms\s+and\s+conditions/i,
  /privacy\s+policy/i,
  /terms\s+of\s+service/i,
]

/**
 * Classifies a user query or document as in_scope, ambiguous, or out_of_scope.
 * Applies the benefit-of-the-doubt principle: documents with any legal indicator
 * are classified as ambiguous, not out_of_scope.
 *
 * @param input - The text content to classify
 * @param type - Whether the input is a 'document' or 'query'
 * @returns ScopeClassificationResult
 */
export async function classifyScope(
  input: string,
  type: 'document' | 'query'
): Promise<ScopeClassificationResult> {
  const lowerInput = input.toLowerCase()

  if (type === 'query') {
    return classifyQuery(lowerInput)
  }

  return classifyDocument(lowerInput)
}

/**
 * Classifies a user query as legal or non-legal.
 * Checks for legal concepts, clause references, and document terms.
 */
function classifyQuery(query: string): ScopeClassificationResult {
  const legalKeywordCount = LEGAL_KEYWORDS.filter(
    keyword => query.includes(keyword.toLowerCase())
  ).length

  // Strong legal signal — clearly about legal concepts
  if (legalKeywordCount >= 2) {
    return 'in_scope'
  }

  // Weak legal signal — might be legal, benefit of the doubt
  if (legalKeywordCount === 1) {
    return 'ambiguous'
  }

  // Check for general legal question patterns
  const legalQuestionPatterns = [
    /can\s+(they|the\s+\w+|i|we)\s+(terminate|cancel|modify|amend|breach)/i,
    /what\s+(are|is)\s+(my|the|our|a|an)?\s*(right|obligation|liabilit|contract|agreement|lease|nda|term|clause|statute|law)/i,
    /what\s+(are|is)\s+(a|an)\s+(contract|agreement|lease|nda|non.?disclosure)/i,
    /what\s+happens\s+if/i,
    /how\s+(long|much|many)\s+(is|are|does)\s+(the\s+)?(contract|agreement|term)/i,
    /is\s+this\s+(legal|enforceable|binding|valid)/i,
    /do\s+(i|we|they)\s+(need|have|require)\s+(a|an|the)\s+(contract|agreement|nda|lease|permit|license)/i,
    /what\s+(does|is)\s+(a|an|the)\s+(contract|agreement|nda|lease|clause|term|law|regulation|statute)/i,
    /what\s+(does|is)\s+(a|an)\s+(legal|legally|legality|lawyer|attorney|solicitor)/i,
  ]

  const hasLegalPattern = legalQuestionPatterns.some(pattern => pattern.test(query))

  if (hasLegalPattern) {
    return 'in_scope'
  }

  return 'out_of_scope'
}

/**
 * Classifies a document as legal or non-legal.
 * Uses the benefit-of-the-doubt rule: only documents with zero
 * legal indicators return out_of_scope.
 */
function classifyDocument(text: string): ScopeClassificationResult {
  // Check structural patterns first — strong signal
  const hasStructure = LEGAL_STRUCTURE_PATTERNS.some(pattern => pattern.test(text))

  if (hasStructure) {
    return 'in_scope'
  }

  // Count keyword matches
  const matchCount = LEGAL_KEYWORDS.filter(
    keyword => text.includes(keyword.toLowerCase())
  ).length

  // Strong legal signal
  if (matchCount >= 5) {
    return 'in_scope'
  }

  // Benefit-of-the-doubt: any legal indicator → ambiguous, not out_of_scope
  if (matchCount >= 1) {
    return 'ambiguous'
  }

  // Zero legal indicators
  return 'out_of_scope'
}
