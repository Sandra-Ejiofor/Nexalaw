import type { ReactNode } from 'react'
import styles from './Card.module.css'

interface CardProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}

export function Card({ children, className, style, onClick }: CardProps): React.JSX.Element {
  return (
    <div
      className={`${styles.card} ${onClick ? styles.clickable : ''} ${className ?? ''}`}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick() } : undefined}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }): React.JSX.Element {
  return <div className={`${styles.header} ${className ?? ''}`}>{children}</div>
}

export function CardTitle({ children }: { children: ReactNode }): React.JSX.Element {
  return <h3 className={styles.title}>{children}</h3>
}

export function CardBody({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className={styles.body}>{children}</div>
}

export function CardFooter({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className={styles.footer}>{children}</div>
}
