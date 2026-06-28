import { NexalawError } from '@/types'
import { LEGAL_DISCLAIMER } from '@/constants'
import { ERROR_CODES } from '@/constants/errors'
import { sanitizeText } from '@/lib/sanitize'
import { SYSTEM_PROMPTS } from './prompts'

const GENERATION_TIMEOUT_MS = 60_000

export async function generateDocumentContent(
  templateType: string,
  inputParameters: Record<string, string>
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  const apiUrl = process.env.DEEPSEEK_API_URL ?? 'https://api.deepseek.com'
  const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat'

  const systemPrompt = SYSTEM_PROMPTS[templateType]
  if (!systemPrompt) {
    throw new NexalawError('E007', `Unknown template type: ${templateType}`)
  }

  const paramList = Object.entries(inputParameters)
    .map(([key, value]) => `- ${key}: ${sanitizeText(value)}`)
    .join('\n')

  if (!apiKey) {
    return generateFallbackDocument(templateType, inputParameters)
  }

  const userPrompt = `Generate a legal document using the following details:

${paramList}

Generate the complete document with all standard clauses, using the parameters above. Format it with clear section headings.`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS)

    const response = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error('[generate/generator] DeepSeek API error:', response.status)
      throw new NexalawError('E007', ERROR_CODES.E007)
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const aiResponse = data.choices?.[0]?.message?.content

    if (!aiResponse) {
      throw new NexalawError('E007', 'No response from AI provider')
    }

    let content = aiResponse.trim()
    content += `\n\n---\n_${LEGAL_DISCLAIMER}_`

    return content
  } catch (error) {
    if (error instanceof NexalawError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[generate/generator] DeepSeek API timeout')
      throw new NexalawError('E007', ERROR_CODES.E007)
    }
    console.error('[generate/generator] DeepSeek API error:', error)
    throw new NexalawError('E007', ERROR_CODES.E007)
  }
}

function generateFallbackDocument(
  templateType: string,
  params: Record<string, string>
): string {
  const templateName = templateType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const date = params.effectiveDate ?? new Date().toISOString().split('T')[0]
  const law = params.governingLaw ?? 'the applicable jurisdiction'
  const now = new Date().toISOString()

  const paramSection = Object.entries(params)
    .map(([key, value]) => `- **${key}**: ${value}`)
    .join('\n')

  return `${templateName.toUpperCase()}

This document was drafted using Nexalaw's document generation feature.

Parameters Used:
${paramSection}

Date of generation: ${now}

---

This is a ${templateName} entered into on ${date} and governed by the laws of ${law}.

${LEGAL_DISCLAIMER}

---
_${LEGAL_DISCLAIMER}_`
}
