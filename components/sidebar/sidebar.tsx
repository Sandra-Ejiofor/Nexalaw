'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'
import { NewChatButton } from './new-chat-button'
import { SearchChat } from './search-chat'
import { LibraryNav } from './library-nav'
import { HistoryList } from './history-list'

export function Sidebar(): React.JSX.Element {
  return (
    <aside className="sidebar" aria-label="Dashboard navigation">
      <div className="sidebar-header">
        <Link href="/chat" className="sidebar-logo">
          Nexa<span className="sidebar-logo-accent">law</span>
        </Link>
      </div>

      <div className="sidebar-actions">
        <NewChatButton />
        <SearchChat />
      </div>

      <nav className="sidebar-nav" aria-label="Sidebar navigation">
        <LibraryNav />
        <HistoryList />
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-signout"
          onClick={() => signOut({ callbackUrl: '/auth' })}
          aria-label="Sign out"
        >
          <LogOut size={20} aria-hidden="true" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
