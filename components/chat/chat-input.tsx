'use client'

import { useState, useRef } from 'react'
import { Send, Paperclip, Loader2 } from 'lucide-react'

const ACCEPTED_TYPES = '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'
const MAX_SIZE = 10 * 1024 * 1024

interface ChatInputProps {
  onSend: (message: string) => void
  onUpload: (file: File) => void
  disabled: boolean
  isUploading: boolean
  placeholder?: string
}

export function ChatInput({ onSend, onUpload, disabled, isUploading, placeholder }: ChatInputProps): React.JSX.Element {
  const [input, setInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || disabled) return
    onSend(input.trim())
    setInput('')
  }

  const handleFilePick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.size > MAX_SIZE) return
    onUpload(file)
  }

  return (
    <form className="chat-input-area" onSubmit={handleSubmit}>
      <button
        type="button"
        onClick={handleFilePick}
        disabled={disabled || isUploading}
        className="chat-attach-btn"
        title="Upload a document"
      >
        {isUploading ? <Loader2 className="chat-spinner" size={18} /> : <Paperclip size={18} />}
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
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder ?? 'Ask a legal question...'}
        disabled={disabled || isUploading}
        className="chat-text-input"
      />
      <button
        type="submit"
        disabled={!input.trim() || disabled || isUploading}
        className="chat-send-btn"
        aria-label="Send message"
      >
        <Send size={18} />
      </button>
    </form>
  )
}
