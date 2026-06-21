import Link from 'next/link'
import styles from './Navbar.module.css'

interface NavbarProps {
  showAuthLinks?: boolean
}

export function Navbar({ showAuthLinks = true }: NavbarProps): React.JSX.Element {
  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <Link href="/" className={styles.logo}>
        Nexa<span className={styles.logoAccent}>law</span>
      </Link>
      {showAuthLinks && (
        <div className={styles.links}>
          <Link href="/auth" className={styles.navLink}>
            Log in
          </Link>
          <Link href="/auth" className={styles.navLink}>
            Get started
          </Link>
        </div>
      )}
    </nav>
  )
}
