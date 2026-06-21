'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, MessageSquare, Loader2 } from 'lucide-react'

interface SearchResult {
  id: string
  preview: string
  date: Date
}

export function SearchChat(): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults([])
      setSelectedIndex(-1)
    }
  }, [isOpen])

  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    setSelectedIndex(-1)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!value.trim()) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/chat/search?q=${encodeURIComponent(value)}`)
        const data = await res.json()
        setResults(data.success ? (data.data ?? []) : [])
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }, [])

  const handleSelect = useCallback((id: string) => {
    setIsOpen(false)
    router.push(`/chat/${id}`)
  }, [router])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault()
      handleSelect(results[selectedIndex].id)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }, [results, selectedIndex, handleSelect])

  const openSearch = useCallback(() => setIsOpen(true), [])

  return (
    <>
      <button className="search-chat-trigger" onClick={openSearch} aria-label="Search conversations">
        <Search size={20} aria-hidden="true" />
        <span>Search Chat</span>
      </button>

      {isOpen && (
        <div className="search-overlay" onClick={() => setIsOpen(false)}>
          <div className="search-modal" onClick={e => e.stopPropagation()}>
            <div className="search-modal-header">
              <Search size={18} className="search-modal-icon" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => handleSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search conversations..."
                className="search-modal-input"
              />
              {isSearching && <Loader2 size={16} className="search-spinner" />}
              <button
                className="search-modal-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close search"
              >
                <X size={18} />
              </button>
            </div>

            <div className="search-modal-body">
              {!query.trim() && (
                <div className="search-modal-hint">
                  Search through your conversation history
                </div>
              )}

              {query.trim() && !isSearching && results.length === 0 && (
                <div className="search-modal-empty">No conversations found</div>
              )}

              {results.length > 0 && (
                <div className="search-modal-results">
                  {results.map((r, i) => (
                    <button
                      key={r.id}
                      className={`search-modal-result ${i === selectedIndex ? 'selected' : ''}`}
                      onClick={() => handleSelect(r.id)}
                      onMouseEnter={() => setSelectedIndex(i)}
                    >
                      <MessageSquare size={16} className="search-modal-result-icon" aria-hidden="true" />
                      <div className="search-modal-result-content">
                        <span className="search-modal-result-text">{r.preview}</span>
                        <span className="search-modal-result-date">
                          {new Date(r.date).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
