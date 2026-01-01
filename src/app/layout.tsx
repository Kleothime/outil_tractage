import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Outil Tractage Paris 2026',
  description: 'Suivi des actions de terrain - Campagne Paris 2026',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  )
}
