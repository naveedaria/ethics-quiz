import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ethics Quiz',
  description: 'Interactive ethics quiz with real-time synchronization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

