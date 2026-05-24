import { Inter, Syne, DM_Sans } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/context/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/lib/context/ThemeContext'

const inter = Inter({ subsets: ['latin'] })
const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '600', '700', '800'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

const siteUrl = 'https://cric-v.live'

export const metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: 'CRIC-V — AI Cricket Coaching & Biomechanical Analysis Platform',
    template: '%s | CRIC-V'
  },

  description: 'CRIC-V brings professional-grade AI cricket coaching to grassroots academies in Pakistan. Free biomechanical analysis, ICC compliance checking, ball tracking, pose estimation and pitch heatmaps — no expensive hardware needed.',

  keywords: [
    'cricket coaching software Pakistan',
    'AI cricket analysis',
    'cricket biomechanical analysis',
    'cricket pose estimation',
    'YOLOv8 cricket ball tracking',
    'ICC elbow compliance',
    'cricket academy software',
    'grassroots cricket technology Pakistan',
    'cricket shot classification',
    'MediaPipe cricket',
    'affordable cricket coaching',
    'cricket training video analysis',
    'bowling action analysis',
    'batting stance analyzer',
    'cricket pitch heatmap',
    'AI sports coaching Pakistan',
    'cricket performance analytics',
    'low cost cricket technology',
    'digital cricket coaching',
    'CRIC-V cricket vision'
  ],

  authors: [
    { name: 'M. Talha Manzoor', url: siteUrl },
    { name: 'Sameer Akram' }
  ],

  creator: 'M. Talha Manzoor',
  publisher: 'Lahore Garrison University',

  category: 'Sports Technology',

  classification: 'Cricket Coaching Software',

  applicationName: 'CRIC-V',

  generator: 'Next.js',

  referrer: 'origin-when-cross-origin',

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  openGraph: {
    type: 'website',
    locale: 'en_PK',
    alternateLocale: ['en_US', 'ur_PK'],
    url: siteUrl,
    siteName: 'CRIC-V',
    title: 'CRIC-V — AI Cricket Coaching & Biomechanical Analysis Platform',
    description: 'Professional AI cricket coaching for Pakistani grassroots academies. Free biomechanical analysis, ICC compliance, ball tracking and pose estimation with any camera.',
    images: [
      {
        url: '/og/og-main.jpg',
        width: 1200,
        height: 630,
        alt: 'CRIC-V — AI Cricket Coaching Platform by M. Talha Manzoor',
        type: 'image/jpeg',
      },
      {
        url: '/og/og-square.jpg',
        width: 1200,
        height: 1200,
        alt: 'CRIC-V Cricket Vision AI',
        type: 'image/jpeg',
      }
    ],
  },

  twitter: {
    card: 'summary_large_image',
    site: '@cricv_ai',
    creator: '@cricv_ai',
    title: 'CRIC-V — AI Cricket Coaching Platform',
    description: 'Professional AI cricket coaching for Pakistani academies. Free biomechanical analysis, ICC compliance & ball tracking. No expensive hardware needed.',
    images: ['/og/og-twitter.jpg'],
  },

  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },

  manifest: '/manifest.json',

  alternates: {
    canonical: siteUrl,
  },

  verification: {
    google: 'REPLACE_WITH_GOOGLE_SEARCH_CONSOLE_CODE',
    // yandex: 'REPLACE_IF_NEEDED',
  },

  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'CRIC-V',
    'application-name': 'CRIC-V',
    'msapplication-TileColor': '#22c55e',
    'msapplication-config': '/browserconfig.xml',
    'theme-color': '#22c55e',
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('cric-v-theme') || 'dark';
                if (theme === 'dark') document.documentElement.classList.add('dark');
              })()
            `
          }}
        />
      </head>
      <body className={`${inter.className} ${syne.variable} ${dmSans.variable} font-sans bg-slate-950 text-white`}>
        <AuthProvider>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}