'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, AlertCircle, Loader2 } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { Button, Input } from '@/components/ui'

interface Message {
  id: string
  role: 'user' | 'system' | 'error'
  content: string
  confidence?: 'high' | 'medium' | 'low' | 'unresolved'
}

interface ChatInterfaceProps {
  documentId: string
  sessionId: string
}

export function ChatInterface({ documentId, sessionId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'system',
      content: 'Hello! I have analyzed this document. What would you like to know? (e.g. "Can they terminate this agreement early?")'
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isTyping) return

    const userMessage: Message = { id: uuidv4(), role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    try {
      const res = await fetch(`/api/documents/${documentId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuery: userMessage.content, sessionId })
      })
      const data = await res.json()

      if (!res.ok) {
        setMessages(prev => [...prev, {
          id: uuidv4(),
          role: 'error',
          content: data.message || 'Sorry, I encountered an error while processing your request.'
        }])
      } else {
        setMessages(prev => [...prev, {
          id: uuidv4(),
          role: 'system',
          content: data.data.response,
          confidence: data.data.confidenceLevel
        }])
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'error',
        content: 'Network error. Please try again later.'
      }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="chat-container">
      <div className="messages-area">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-wrapper ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? <User size={20} /> : msg.role === 'error' ? <AlertCircle size={20} color="hsl(0, 65%, 48%)" /> : <Bot size={20} />}
            </div>
            <div className="message-content">
              <div className="message-bubble">
                <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                {msg.confidence && msg.confidence === 'low' && (
                  <div className="confidence-warning">
                    <AlertCircle size={14} /> Low confidence response. Please review the document carefully.
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="message-wrapper system">
             <div className="message-avatar">
              <Bot size={20} />
            </div>
            <div className="message-bubble typing">
              <Loader2 className="spinner" size={20} />
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this document..."
          disabled={isTyping}
          className="chat-input"
        />
        <Button type="submit" disabled={!input.trim() || isTyping} className="send-button">
          <Send size={18} />
        </Button>
      </form>

      <style>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 600px;
          border: 1px solid var(--color-outline-variant);
          background-color: var(--color-surface-container-lowest);
        }
        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .message-wrapper {
          display: flex;
          gap: 16px;
          max-width: 85%;
        }
        .message-wrapper.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }
        .message-wrapper.system, .message-wrapper.error {
          align-self: flex-start;
        }
        .message-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: var(--color-surface-container);
          color: var(--color-on-surface-variant);
          flex-shrink: 0;
        }
        .user .message-avatar {
          background-color: var(--color-primary);
          color: var(--color-on-primary);
        }
        .system .message-avatar {
          background-color: var(--color-secondary);
          color: var(--color-on-secondary);
        }
        .message-bubble {
          padding: 16px;
          background-color: var(--color-surface-container);
          color: var(--color-on-surface);
          border-radius: 8px;
          border-top-left-radius: 0;
          font-family: var(--typography-body-medium-font-family);
          line-height: var(--typography-body-medium-line-height);
        }
        .user .message-bubble {
          background-color: var(--color-primary-container);
          color: var(--color-on-primary-container);
          border-radius: 8px;
          border-top-right-radius: 0;
        }
        .error .message-bubble {
          background-color: hsla(0, 65%, 48%, 0.1);
          color: hsl(0, 65%, 48%);
          border: 1px solid hsl(0, 65%, 48%);
        }
        .confidence-warning {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--color-outline-variant);
          font-size: var(--typography-label-small-font-size);
          color: hsl(40, 80%, 40%);
        }
        .typing {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--color-on-surface-variant);
          font-style: italic;
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .input-area {
          display: flex;
          gap: 12px;
          padding: 16px;
          border-top: 1px solid var(--color-outline-variant);
          background-color: var(--color-surface);
        }
        .chat-input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid var(--color-outline);
          font-family: inherit;
          font-size: inherit;
          background-color: var(--color-surface-container-lowest);
        }
        .chat-input:focus {
          outline: none;
          border-color: var(--color-secondary);
          box-shadow: 0 0 0 1px var(--color-secondary);
        }
        .send-button {
          min-height: auto;
          padding: 0 20px;
        }
      `}</style>
    </div>
  )
}
