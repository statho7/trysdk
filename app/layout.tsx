import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Try SDK — Instant GitHub frontend previews',
  description: 'Paste a GitHub repository URL and open a temporary live preview.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('trysdk-theme')==='light')document.documentElement.classList.remove('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--gh-canvas)] antialiased">{children}</body>
    </html>
  )
}
