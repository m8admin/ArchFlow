import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ArchFlow',
  description: 'Architecture project OS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
