'use client'

import { useRef, useEffect } from 'react'
import { Bot, Loader2 } from 'lucide-react'
import { ChatMessage, type Message } from './chat-message'

interface ChatMessagesProps {
  messages: Message[]
  isTyping: boolean
}

export function ChatMessages({ messages, isTyping }: ChatMessagesProps): React.JSX.Element {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  return (
    <div className="chat-messages">
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}
      {isTyping && (
        <div className="chat-message assistant">
          <div className="chat-message-avatar">
            <Bot size={18} />
          </div>
          <div className="chat-message-bubble chat-message-typing">
            <Loader2 className="chat-spinner" size={16} />
            Thinking...
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  )
}
