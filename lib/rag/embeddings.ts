import { prisma } from '@/lib/prisma'
import type { Clause, ClauseType } from '@prisma/client'

function generateSimpleEmbedding(text: string): Map<string, number> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2)

  const wordFreq = new Map<string, number>()
  for (const word of words) {
    wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1)
  }

  const totalWords = words.length || 1
  for (const [word, count] of wordFreq) {
    wordFreq.set(word, count / totalWords)
  }

  return wordFreq
}

function cosineSimilarity(
  embeddingA: Map<string, number>,
  embeddingB: Map<string, number>
): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (const [word, weightA] of embeddingA) {
    const weightB = embeddingB.get(word) ?? 0
    dotProduct += weightA * weightB
    normA += weightA * weightA
  }

  for (const [, weightB] of embeddingB) {
    normB += weightB * weightB
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
  if (magnitude === 0) return 0

  return dotProduct / magnitude
}

function chunkText(text: string, chunkSize: number = 1000): string[] {
  const chunks: string[] = []
  const paragraphs = text.split(/\n\n+/)
  let current = ''
  for (const para of paragraphs) {
    if ((current + para).length > chunkSize && current.length > 0) {
      chunks.push(current.trim())
      current = para
    } else {
      current += (current ? '\n\n' : '') + para
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks.length > 0 ? chunks : [text.trim()]
}

function rankChunks(query: string, chunks: string[], topN: number): string[] {
  const queryEmbedding = generateSimpleEmbedding(query)
  const scored = chunks.map(chunk => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, generateSimpleEmbedding(chunk)),
  }))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topN).filter(s => s.score > 0.05).map(s => s.chunk)
}

export async function retrieveRelevantClauses(
  query: string,
  source: string | Clause[],
  topN: number = 5
): Promise<Clause[]> {
  let clauses: Clause[]

  if (typeof source === 'string') {
    clauses = await prisma.clause.findMany({
      where: { documentId: source },
    })

    if (clauses.length === 0) {
      const doc = await prisma.document.findUnique({
        where: { id: source },
        select: { id: true, extractedText: true },
      })
      if (doc?.extractedText) {
        const chunks = chunkText(doc.extractedText)
        const topChunks = rankChunks(query, chunks, topN)
        if (topChunks.length === 0) return []
        return topChunks.map((text, i) => ({
          id: `${doc.id}-chunk-${i}`,
          documentId: doc.id,
          clauseType: 'other' as ClauseType,
          rawText: text,
          simplifiedText: null,
          pageNumber: null,
          startIndex: 0,
          endIndex: text.length,
          isFlagged: false,
          createdAt: new Date(),
        }))
      }
      return []
    }
  } else {
    clauses = source
  }

  if (clauses.length === 0) {
    return []
  }

  const queryEmbedding = generateSimpleEmbedding(query)

  const scoredClauses = clauses.map(clause => ({
    clause,
    score: cosineSimilarity(queryEmbedding, generateSimpleEmbedding(clause.rawText)),
  }))

  scoredClauses.sort((a, b) => b.score - a.score)

  return scoredClauses
    .slice(0, topN)
    .filter(sc => sc.score > 0.05)
    .map(sc => sc.clause)
}
