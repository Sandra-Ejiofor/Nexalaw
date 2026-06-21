import { LEGAL_DISCLAIMER } from '@/constants'
import { sanitizeText } from '@/lib/sanitize'

const COMMON_TOPICS: Array<{
  keywords: string[]
  respond: () => string
}> = [
  {
    keywords: ['nda', 'non-disclosure', 'non disclosure', 'confidentiality agreement', 'nda'],
    respond: () =>
      `An NDA (Non-Disclosure Agreement) is a legally binding contract that creates a confidential relationship between parties. It ensures that sensitive information shared during business discussions is not disclosed to third parties.

Key things to understand about NDAs:
• They define what counts as "confidential information"
• They specify how long the confidentiality obligation lasts
• They outline permitted uses of the information
• They often include exceptions (e.g., information already public, required by law)

If you have a specific NDA document, upload it so I can analyze the exact terms and identify any unusual clauses.`,
  },
  {
    keywords: ['lease', 'rental', 'tenant', 'landlord', 'rent'],
    respond: () =>
      `A lease agreement is a contract between a landlord (lessor) and a tenant (lessee) that governs the rental of property.

Important lease terms to watch for:
• Rent amount, due date, and late fees
• Security deposit terms and return conditions
• Maintenance responsibilities (who fixes what)
• Subletting rules (can you find a replacement tenant?)
• Termination and early exit conditions
• Renewal and rent increase clauses

Upload your lease agreement for a detailed clause-by-clause analysis.`,
  },
  {
    keywords: ['termination', 'terminate', 'cancel', 'end agreement', 'early'],
    respond: () =>
      `Termination clauses define how and when a contract can be ended before its natural expiration.

Common termination considerations:
• **For cause** — immediate termination if one party breaches
• **Without cause** — termination for convenience, usually with notice period
• **Notice period** — how far in advance you must notify
• **Fees or penalties** — early termination fees, liquidated damages
• **Surviving obligations** — clauses that continue after termination (confidentiality, indemnification, etc.)

Upload your specific agreement to see what termination terms apply to your situation.`,
  },
  {
    keywords: ['contract', 'agreement', 'enforceable', 'binding', 'legal'],
    respond: () =>
      `For a contract to be legally enforceable, it generally needs:
• **Offer and acceptance** — one party makes an offer, the other accepts
• **Consideration** — something of value is exchanged
• **Capacity** — both parties are legally capable of contracting
• **Legal purpose** — the contract is for a lawful activity

Contracts can be written, oral, or implied, though written contracts are much easier to enforce.

If you have a specific contract, upload it and I can help you understand the terms and identify any risks.`,
  },
  {
    keywords: ['liability', 'indemnify', 'indemnification', 'hold harmless', 'responsible for damages'],
    respond: () =>
      `Liability and indemnification clauses determine who bears financial responsibility if something goes wrong.

Key aspects:
• **Limitation of liability** — caps the maximum amount one party must pay
• **Indemnification** — one party agrees to cover losses the other party incurs
• **Mutual vs. one-sided** — both parties may indemnify each other, or only one
• **Exclusions** — certain types of damages may be excluded (e.g., consequential damages)

These are often the most heavily negotiated clauses in commercial agreements. Upload your document for a detailed risk assessment.`,
  },
  {
    keywords: ['arbitration', 'dispute', 'lawsuit', 'court', 'jurisdiction', 'governing law'],
    respond: () =>
      `Dispute resolution clauses define how disagreements will be handled:

• **Governing law** — which state or country's laws apply
• **Jurisdiction** — where a lawsuit must be filed
• **Arbitration** — disputes go to a private arbitrator instead of court
• **Mediation** — a neutral third party helps negotiate a resolution
• **Class action waiver** — you give up the right to sue as part of a group

Arbitration clauses are common and often limit your ability to take disputes to court. Upload your document so I can review the specific dispute resolution terms.`,
  },
]

function findTopicMatch(query: string): string | null {
  const lower = query.toLowerCase()
  for (const topic of COMMON_TOPICS) {
    const matchCount = topic.keywords.filter(kw => lower.includes(kw)).length
    if (matchCount >= 1) {
      return topic.respond()
    }
  }
  return null
}

export function generateGeneralLegalResponse(userQuery: string): string {
  const sanitized = sanitizeText(userQuery)
  const topicResponse = findTopicMatch(sanitized)

  if (topicResponse) {
    return `${topicResponse}\n\n---\n_${LEGAL_DISCLAIMER}_`
  }

  return `That's a great legal question. Here's some general guidance:

Legal documents can be complex, and the answer often depends on the specific terms of your agreement. To give you a more precise answer:

1. **Upload your document** — I can analyze the exact language and provide answers grounded in your specific contract.
2. **Ask a more specific question** — For example, "What is the notice period for termination?" or "How are payment terms structured?"

In the meantime, the key principle is: always read your contract carefully, and when in doubt, consult a qualified legal professional.

${LEGAL_DISCLAIMER}`
}
