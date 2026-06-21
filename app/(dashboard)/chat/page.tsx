'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { ChatMessages } from '@/components/chat/chat-messages'
import type { Message } from '@/components/chat/chat-message'
import { ChatInput } from '@/components/chat/chat-input'
import { DocumentPreview } from '@/components/chat/document-preview'
import '@/components/chat/style.css'

export default function NewChatPage() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to Nexalaw. Ask any legal question in plain English, or upload a document for specific analysis.',
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [activeDoc, setActiveDoc] = useState<{ id: string; name: string } | null>(null)
  const [isCreatingSession, setIsCreatingSession] = useState(true)

  useEffect(() => {
    const createSession = async () => {
      try {
        const res = await fetch('/api/chat', { method: 'POST' })
        const data = await res.json()
        if (data.success && data.data?.sessionId) {
          const newSessionId = data.data.sessionId
          setSessionId(newSessionId)
          router.replace(`/chat/${newSessionId}`, { scroll: false })
          return
        }
      } catch {
        // Fall back to local-only mode
      } finally {
        setIsCreatingSession(false)
      }
    }
    createSession()
  }, [router])

  const handleSend = useCallback(async (input: string) => {
    if (!sessionId) return

    const userMsg: Message = { id: uuidv4(), role: 'user', content: input }
    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    try {
      const body: Record<string, string> = { userQuery: input, sessionId }
      if (activeDoc) body.documentId = activeDoc.id

      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { id: uuidv4(), role: 'error', content: data.message || 'Sorry, I encountered an error.' },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            role: 'assistant',
            content: data.data.response,
            confidence: data.data.confidenceLevel,
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: uuidv4(), role: 'error', content: 'Network error. Please try again later.' },
      ])
    } finally {
      setIsTyping(false)
    }
  }, [sessionId, activeDoc])

  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { id: uuidv4(), role: 'error', content: data.message || 'Upload failed.' },
        ])
        return
      }

      const docId = data.data.documentId
      setActiveDoc({ id: docId, name: file.name })

      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: 'upload',
          content: `**${file.name}** uploaded and processing. You can now ask questions about this document.`,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: uuidv4(), role: 'error', content: 'Network error during upload.' },
      ])
    } finally {
      setIsUploading(false)
    }
  }, [])

  if (isCreatingSession) {
    return (
      <div className="chat-loading">
        <span>Starting new conversation...</span>
        <style>{`
          .chat-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: calc(100vh - 64px);
            color: var(--color-on-surface-variant);
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="chat-page">
      {activeDoc && (
        <DocumentPreview
          documentId={activeDoc.id}
          fileName={activeDoc.name}
          onDismiss={() => setActiveDoc(null)}
        />
      )}

      <ChatMessages messages={messages} isTyping={isTyping} />

      <ChatInput
        onSend={handleSend}
        onUpload={handleUpload}
        disabled={isTyping}
        isUploading={isUploading}
        placeholder={activeDoc ? 'Ask a question about this document...' : 'Ask a legal question in plain English...'}
      />

      <style>{`
        .chat-page {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 64px);
          max-width: 800px;
          margin: 0 auto;
          background-color: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
        }
      `}</style>
    </div>
  )
}
