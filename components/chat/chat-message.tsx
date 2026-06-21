'use client'

import { Bot, User, AlertCircle, FileText } from 'lucide-react'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'error' | 'upload'
  content: string
  confidence?: 'high' | 'medium' | 'low' | 'unresolved'
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps): React.JSX.Element {
  const { role, content, confidence } = message

  const isUser = role === 'user'
  const isError = role === 'error'
  const isUpload = role === 'upload'
  const displayRole = isUpload ? 'assistant' : role

  return (
    <div className={`chat-message ${displayRole}`}>
      <div className="chat-message-avatar">
        {isUser ? (
          <User size={18} />
        ) : isError ? (
          <AlertCircle size={18} />
        ) : isUpload ? (
          <FileText size={18} />
        ) : (
          <Bot size={18} />
        )}
      </div>
      <div className={`chat-message-bubble ${isUpload ? 'chat-message-upload' : ''} ${isError ? 'chat-message-error' : ''}`}>
        <div className="chat-message-text">{content}</div>
        {confidence === 'low' && (
          <div className="chat-message-warning">
            <AlertCircle size={14} />
            Low confidence response. Please review the document carefully.
          </div>
        )}
      </div>
    </div>
  )
}
