'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { signOut } from 'next-auth/react'
import { LogOut, Menu, X } from 'lucide-react'
import { NewChatButton } from './new-chat-button'
import { SearchChat } from './search-chat'
import { LibraryNav } from './library-nav'
import { HistoryList } from './history-list'

export function Sidebar(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile Top Header */}
      <div className="mobile-dashboard-header">
        <button className="mobile-menu-btn" onClick={() => setIsOpen(true)}>
          <Menu size={24} />
        </button>
        <Link href="/chat" className="mobile-header-logo">
          <Image src="/dark-logo.png" alt="Nexalaw" width={110} height={28} priority />
        </Link>
      </div>

      {/* Mobile Backdrop */}
      {isOpen && <div className="sidebar-backdrop" onClick={() => setIsOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} aria-label="Dashboard navigation">
        <div className="sidebar-header">
          <Link href="/chat" className="sidebar-logo" onClick={() => setIsOpen(false)}>
            <Image src="/dark-logo.png" alt="Nexalaw" width={130} height={34} priority />
          </Link>
          <button className="mobile-close-btn" onClick={() => setIsOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="sidebar-actions">
          <div onClick={() => setIsOpen(false)}>
            <NewChatButton />
          </div>
          <SearchChat />
        </div>

        <nav className="sidebar-nav" aria-label="Sidebar navigation" onClick={() => setIsOpen(false)}>
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
    </>
  )
}
