import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nexalaw — Ask Legal Questions, Get Plain-English Answers',
  description:
    'Ask legal questions in plain English and get clear, understandable answers. Optionally upload documents for AI-powered clause analysis and risk detection. A legal literacy tool for non-lawyers.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Geist:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
