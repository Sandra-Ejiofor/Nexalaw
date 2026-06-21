'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Library } from 'lucide-react'

export function LibraryNav(): React.JSX.Element {
  const pathname = usePathname()
  const isActive = pathname.startsWith('/library')

  return (
    <Link
      href="/library"
      className={`nav-item ${isActive ? 'active' : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <Library size={20} aria-hidden="true" />
      <span>Library</span>
    </Link>
  )
}
