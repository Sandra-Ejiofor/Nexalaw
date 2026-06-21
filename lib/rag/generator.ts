import type { Clause } from '@prisma/client'
import { NexalawError } from '@/types'
import type { GeneratorResponse, ConfidenceLevelValue } from '@/types'
import { DEEPSEEK_TIMEOUT_MS, LEGAL_DISCLAIMER } from '@/constants'
import { ERROR_CODES } from '@/constants/errors'
import { sanitizeText } from '@/lib/sanitize'

// System prompt — sets the AI's role and constraints. Sent on every call.
const NEXALAW_SYSTEM_PROMPT = `
You are a legal document assistant for Nexalaw.
Your role is to help non-lawyers understand legal documents in plain English.
You must:
- Only answer based on the document context provided below.
- Never provide legal advice or simulate a licensed lawyer.
- Always use plain English. No legal jargon in responses.
- If the answer cannot be found in the provided context, say so clearly.
- Never draw on general legal knowledge when document context is available.
- Structure your response with clear sections and short sentences.
- When referencing specific clauses, quote the relevant text briefly.
`

/**
 * Sends a user query with retrieved clause context to the DeepSeek API
 * and returns a structured response with confidence level.
 *
 * All DeepSeek calls are made from this file only — no other file may
 * call the DeepSeek API directly (per architecture.md Section 4).
 *
 * @param userQuery - The sanitized user question
 * @param retrievedClauses - Clause records retrieved by the embeddings module
 * @returns GeneratorResponse with the AI answer, confidence, and clause IDs
 */
export async function generateResponse(
  userQuery: string,
  retrievedClauses: Clause[]
): Promise<GeneratorResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  const apiUrl = process.env.DEEPSEEK_API_URL ?? 'https://api.deepseek.com'
  const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat'

  // If DeepSeek API key is not configured, return a placeholder response
  // This allows the app to function during development without the key
  if (!apiKey) {
    const clauseContext = retrievedClauses.map(c => c.rawText).join('\n\n')

    return {
      response: formatFallbackResponse(userQuery, retrievedClauses),
      confidenceLevel: retrievedClauses.length > 0 ? 'medium' : 'low',
      retrievedClauseIds: retrievedClauses.map(c => c.id),
    }
  }

  // Build the user prompt with clause context
  const clauseContext = retrievedClauses.map(c => c.rawText).join('\n\n')
  const userPrompt = `
Document context:
${clauseContext}

User question:
${sanitizeText(userQuery)}
`

  try {
    // DeepSeek API call with 30-second timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS)

    const response = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: NEXALAW_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error('[generator] DeepSeek API error:', response.status)
      throw new NexalawError('E007', ERROR_CODES.E007)
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const aiResponse = data.choices?.[0]?.message?.content

    if (!aiResponse) {
      throw new NexalawError('E007', 'No response from AI provider')
    }

    // Determine confidence level based on clause count and response quality
    const confidenceLevel = assessConfidence(retrievedClauses, aiResponse)

    // Build the final response with disclaimer
    let finalResponse = aiResponse.trim()

    // Append low-confidence advisory if needed
    if (confidenceLevel === 'low' || confidenceLevel === 'unresolved') {
      finalResponse += `\n\n⚠️ ${ERROR_CODES.E005}`
    }

    // Always append the legal disclaimer
    finalResponse += `\n\n---\n_${LEGAL_DISCLAIMER}_`

    return {
      response: finalResponse,
      confidenceLevel,
      retrievedClauseIds: retrievedClauses.map(c => c.id),
    }
  } catch (error) {
    if (error instanceof NexalawError) throw error

    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[generator] DeepSeek API timeout')
      throw new NexalawError('E007', ERROR_CODES.E007)
    }

    console.error('[generator] DeepSeek API error:', error)
    throw new NexalawError('E007', ERROR_CODES.E007)
  }
}

/**
 * Assesses the confidence level of a generated response.
 * Based on the number of relevant clauses found and response content.
 */
function assessConfidence(
  clauses: Clause[],
  response: string
): ConfidenceLevelValue {
  if (clauses.length === 0) {
    return 'unresolved'
  }

  if (clauses.length >= 3) {
    return 'high'
  }

  // Check if the response acknowledges uncertainty
  const uncertaintyPhrases = [
    'not clear', 'cannot determine', 'no specific', 'not found',
    'unclear', 'insufficient', 'not enough', 'ambiguous',
  ]

  const hasUncertainty = uncertaintyPhrases.some(
    phrase => response.toLowerCase().includes(phrase)
  )

  if (hasUncertainty) {
    return 'low'
  }

  return clauses.length >= 2 ? 'medium' : 'low'
}

/**
 * Creates a fallback response when DeepSeek API is not configured.
 * Uses the retrieved clauses to provide a basic summary.
 */
function formatFallbackResponse(
  query: string,
  clauses: Clause[]
): string {
  if (clauses.length === 0) {
    return `No matching sections were found in the document for your question.\n\n---\n_${LEGAL_DISCLAIMER}_`
  }

  let response = `Based on the document, here are the relevant sections related to your question:\n\n`

  for (const clause of clauses) {
    response += `**${clause.clauseType.replace('_', ' ').toUpperCase()}:**\n`
    response += `> ${clause.rawText.substring(0, 300)}${clause.rawText.length > 300 ? '...' : ''}\n\n`
  }

  response += `\n---\n_${LEGAL_DISCLAIMER}_`

  return response
}
