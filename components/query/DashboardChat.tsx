'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, AlertCircle, Loader2, FileText, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui'

interface Document {
  id: string
  fileName: string
}

interface Message {
  id: string
  role: 'user' | 'system' | 'upload' | 'error'
  content: string
}

interface DashboardChatProps {
  documents: Document[]
}

let msgCounter = 0
function nextId(): string {
  msgCounter += 1
  return `msg-${msgCounter}`
}

const ACCEPTED_TYPES = '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'
const MAX_SIZE = 10 * 1024 * 1024

export function DashboardChat({ documents: initialDocuments }: DashboardChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: nextId(),
      role: 'system',
      content: initialDocuments.length > 0
        ? 'Hello! Ask me anything about your legal documents, upload a new document, or ask a general legal literacy question.'
        : 'Welcome to Nexalaw. Ask any legal question in plain English, or upload a document for specific analysis.',
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
  const [allDocs, setAllDocs] = useState<Document[]>(initialDocuments)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isTyping || isUploading) return

    const userMessage: Message = { id: nextId(), role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    try {
      const body: Record<string, string> = { userQuery: userMessage.content }
      if (selectedDoc) body.documentId = selectedDoc

      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setMessages(prev => [...prev, {
          id: nextId(),
          role: 'error',
          content: data.message || 'Sorry, I encountered an error.',
        }])
      } else {
        setMessages(prev => [...prev, {
          id: nextId(),
          role: 'system',
          content: data.data.response,
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        id: nextId(),
        role: 'error',
        content: 'Network error. Please try again later.',
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleFilePick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    await uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    if (file.size > MAX_SIZE) {
      setMessages(prev => [...prev, {
        id: nextId(),
        role: 'error',
        content: `File too large. Maximum size is 10MB.`,
      }])
      return
    }

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
        setMessages(prev => [...prev, {
          id: nextId(),
          role: 'error',
          content: data.message || 'Upload failed.',
        }])
        return
      }

      const newDoc: Document = { id: data.data.documentId, fileName: file.name }
      setAllDocs(prev => [newDoc, ...prev])
      setSelectedDoc(data.data.documentId)

      setMessages(prev => [...prev, {
        id: nextId(),
        role: 'upload',
        content: `📄 **${file.name}** uploaded and processing. You can now ask questions about this document.`,
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: nextId(),
        role: 'error',
        content: 'Network error during upload.',
      }])
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="dash-chat-container">
      {allDocs.length > 0 && (
        <div className="dash-chat-doc-selector">
          <FileText size={16} />
          <select
            value={selectedDoc ?? ''}
            onChange={e => setSelectedDoc(e.target.value || null)}
            className="dash-chat-select"
          >
            <option value="">Ask generally (no document selected)</option>
            {allDocs.map(doc => (
              <option key={doc.id} value={doc.id}>{doc.fileName}</option>
            ))}
          </select>
        </div>
      )}
      <div className="dash-chat-messages">
        {messages.map(msg => {
          const isUpload = msg.role === 'upload'
          const roleClass = isUpload ? 'system' : msg.role
          return (
            <div key={msg.id} className={`dash-msg-wrapper ${roleClass}`}>
              <div className="dash-msg-avatar">
                {msg.role === 'user'
                  ? <User size={18} />
                  : isUpload
                    ? <FileText size={18} style={{ color: 'var(--color-secondary)' }} />
                    : msg.role === 'error'
                      ? <AlertCircle size={18} color="hsl(0, 65%, 48%)" />
                      : <Bot size={18} />}
              </div>
              <div className={`dash-msg-bubble ${isUpload ? 'dash-msg-upload' : ''}`}>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>{msg.content}</div>
              </div>
            </div>
          )
        })}
        {isTyping && (
          <div className="dash-msg-wrapper system">
            <div className="dash-msg-avatar"><Bot size={18} /></div>
            <div className="dash-msg-bubble dash-typing">
              <Loader2 className="dash-spinner" size={16} /> Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="dash-chat-input-area">
        <button
          type="button"
          onClick={handleFilePick}
          disabled={isUploading}
          className="dash-attach-btn"
          title="Upload a document"
        >
          {isUploading ? <Loader2 className="dash-spinner" size={18} /> : <Paperclip size={18} />}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={allDocs.length > 0 ? 'Ask a legal question...' : 'Ask a legal question or attach a document...'}
          disabled={isTyping || isUploading}
          className="dash-chat-input"
        />
        <Button type="submit" disabled={!input.trim() || isTyping || isUploading} size="small">
          <Send size={16} />
        </Button>
      </form>
      <style>{`
        .dash-chat-container {
          display: flex;
          flex-direction: column;
          height: 500px;
          border: 1px solid var(--color-outline-variant);
          background-color: var(--color-surface-container-lowest);
        }
        .dash-chat-doc-selector {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--color-outline-variant);
          background-color: var(--color-surface);
          color: var(--color-on-surface-variant);
          font-size: 13px;
        }
        .dash-chat-select {
          flex: 1;
          padding: 4px 8px;
          border: 1px solid var(--color-outline);
          background: var(--color-surface-container-lowest);
          font-size: 13px;
        }
        .dash-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .dash-msg-wrapper {
          display: flex;
          gap: 12px;
          max-width: 90%;
        }
        .dash-msg-wrapper.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }
        .dash-msg-wrapper.system, .dash-msg-wrapper.error {
          align-self: flex-start;
        }
        .dash-msg-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: var(--color-surface-container);
          color: var(--color-on-surface-variant);
          flex-shrink: 0;
        }
        .user .dash-msg-avatar {
          background-color: var(--color-primary);
          color: var(--color-on-primary);
        }
        .system .dash-msg-avatar {
          background-color: var(--color-secondary);
          color: var(--color-on-secondary);
        }
        .dash-msg-bubble {
          padding: 12px 16px;
          background-color: var(--color-surface-container);
          color: var(--color-on-surface);
          border-radius: 8px;
          border-top-left-radius: 0;
          line-height: 1.5;
        }
        .dash-msg-upload {
          background-color: hsla(120, 60%, 50%, 0.08);
          border: 1px solid hsla(120, 60%, 50%, 0.2);
        }
        .user .dash-msg-bubble {
          background-color: var(--color-primary-container);
          color: var(--color-on-primary-container);
          border-radius: 8px;
          border-top-right-radius: 0;
        }
        .error .dash-msg-bubble {
          background-color: hsla(0, 65%, 48%, 0.1);
          color: hsl(0, 65%, 48%);
          border: 1px solid hsl(0, 65%, 48%);
        }
        .dash-typing {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-on-surface-variant);
          font-style: italic;
          font-size: 14px;
        }
        .dash-spinner {
          animation: dash-spin 1s linear infinite;
        }
        @keyframes dash-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .dash-chat-input-area {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid var(--color-outline-variant);
          background-color: var(--color-surface);
        }
        .dash-attach-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: 1px solid var(--color-outline);
          background-color: var(--color-surface-container-lowest);
          color: var(--color-on-surface-variant);
          cursor: pointer;
          flex-shrink: 0;
          transition: border-color 0.2s;
        }
        .dash-attach-btn:hover {
          border-color: var(--color-secondary);
          color: var(--color-secondary);
        }
        .dash-attach-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .dash-chat-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid var(--color-outline);
          font-family: inherit;
          font-size: 14px;
          background-color: var(--color-surface-container-lowest);
        }
        .dash-chat-input:focus {
          outline: none;
          border-color: var(--color-secondary);
          box-shadow: 0 0 0 1px var(--color-secondary);
        }
      `}</style>
    </div>
  )
}
