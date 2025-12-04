import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { Providers } from '@/components/providers'
import { HydrationFix } from '@/components/hydration-fix'
import { Prefetch } from '@/components/prefetch'
import '../styles/globals.css'

const inter = Inter({ subsets: ["latin"], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'ICL Budget - Gestion budgétaire intelligente',
  description: 'Solution professionnelle de gestion et supervision budgétaire pour entreprises',
  generator: 'ICL'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.className} antialiased bg-background text-foreground`}>
        <HydrationFix />
        <Providers>
          <Prefetch />
          {children}
        </Providers>
        <Toaster position="top-right" theme="dark" richColors />
      </body>
    </html>
  )
}
