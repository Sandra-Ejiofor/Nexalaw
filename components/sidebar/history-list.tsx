'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { MessageSquare, History, Edit2, Trash2, Check, X } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface ChatSession {
  id: string
  preview: string
  updatedAt: string
}

export function HistoryList(): React.JSX.Element {
  const { data: session } = useSession()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  
  const pathname = usePathname()
  const router = useRouter()

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chat')
      const data = await res.json()
      if (data.success) {
        setSessions(data.data ?? [])
      }
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!session?.user) return
    fetchSessions()
  }, [session])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this chat?')) return
    
    try {
      const res = await fetch(`/api/chat/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== id))
        if (pathname === `/chat/${id}`) {
          router.push('/chat')
        }
      }
    } catch {
      // ignore
    }
  }

  const startEdit = (e: React.MouseEvent, s: ChatSession) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingId(s.id)
    setEditName(s.preview)
  }

  const cancelEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingId(null)
  }

  const saveEdit = async (e: React.MouseEvent | React.FormEvent, id: string) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (!editName.trim()) {
      setEditingId(null)
      return
    }

    try {
      const res = await fetch(`/api/chat/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customName: editName }),
      })
      if (res.ok) {
        setSessions(prev => prev.map(s => s.id === id ? { ...s, preview: editName } : s))
      }
    } catch {
      // ignore
    } finally {
      setEditingId(null)
    }
  }

  const displaySessions = isExpanded ? sessions : sessions.slice(0, 5)

  return (
    <div className="history-list">
      <div className="history-header">
        <History size={20} aria-hidden="true" />
        <span>History</span>
      </div>

      <div className="history-items">
        {loading && (
          <div className="history-loading">Loading...</div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="history-empty">No conversations yet</div>
        )}

        {!loading && displaySessions.map((s) => (
          <div key={s.id} className={`history-item-container ${pathname === `/chat/${s.id}` ? 'active' : ''}`}>
            {editingId === s.id ? (
              <form className="history-item-edit" onSubmit={(e) => saveEdit(e, s.id)}>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                  autoFocus 
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="history-actions visible">
                  <button type="submit" aria-label="Save"><Check size={14} /></button>
                  <button type="button" onClick={cancelEdit} aria-label="Cancel"><X size={14} /></button>
                </div>
              </form>
            ) : (
              <Link
                href={`/chat/${s.id}`}
                className="history-item"
              >
                <MessageSquare size={16} aria-hidden="true" className="history-icon" />
                <div className="history-item-content">
                  <span className="history-item-preview">{s.preview}</span>
                </div>
                <div className="history-actions">
                  <button 
                    type="button" 
                    onClick={(e) => startEdit(e, s)} 
                    aria-label="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    type="button" 
                    onClick={(e) => handleDelete(e, s.id)} 
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Link>
            )}
          </div>
        ))}

        {!loading && sessions.length > 5 && (
          <button
            className="history-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show less' : `Show all (${sessions.length})`}
          </button>
        )}
      </div>
      
      <style>{`
        .history-item-container {
          position: relative;
          border-radius: 6px;
        }
        .history-item-container.active, .history-item-container:hover {
          background-color: var(--color-surface-container-high);
        }
        .history-item {
          display: flex;
          align-items: center;
          padding: 8px;
          gap: 8px;
          text-decoration: none;
          color: inherit;
          border-radius: 6px;
        }
        .history-icon {
          flex-shrink: 0;
        }
        .history-item-content {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }
        .history-item-preview {
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 14px;
        }
        .history-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .history-actions.visible,
        .history-item-container:hover .history-actions {
          opacity: 1;
        }
        .history-actions button {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--color-on-surface-variant);
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }
        .history-actions button:hover {
          background-color: var(--color-surface-container-highest);
          color: var(--color-on-surface);
        }
        .history-item-edit {
          display: flex;
          align-items: center;
          padding: 8px;
          gap: 8px;
        }
        .history-item-edit input {
          flex: 1;
          min-width: 0;
          background: var(--color-surface-container-highest);
          border: 1px solid var(--color-outline);
          color: var(--color-on-surface);
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 14px;
        }
      `}</style>
    </div>
  )
}
