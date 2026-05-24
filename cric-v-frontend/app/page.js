import LandingPage from './LandingPage'

export const metadata = {
  title: 'AI Cricket Coaching & Biomechanical Analysis - Free for Pakistani Academies',
  description: 'CRIC-V gives grassroots cricket coaches in Pakistan professional-grade AI analysis. 33-point pose estimation, 95% ball tracking accuracy, ICC elbow compliance checking, pitch heatmaps — all free, no special hardware needed.',
  alternates: {
    canonical: 'https://cric-v.live',
  },
  openGraph: {
    title: 'CRIC-V — Free AI Cricket Coaching for Pakistan',
    description: 'Professional biomechanical cricket analysis for grassroots academies. Works with any camera. Free forever.',
    url: 'https://cric-v.live',
    images: [{ url: '/og/og-landing.jpg', width: 1200, height: 630 }],
  },
}

export default function Home() {
  return <LandingPage />
}