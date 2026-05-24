'use client'

import dynamic from 'next/dynamic'

const HeroSection = dynamic(() => import('@/components/landing/HeroSection'), { ssr: false })
import NavBar from '@/components/landing/NavBar'
import SkeletonSection from '@/components/landing/SkeletonSection'
import FeaturesSection from '@/components/landing/FeaturesSection'
import HowItWorksSection from '@/components/landing/HowItWorksSection'
import StatsSection from '@/components/landing/StatsSection'
import PitchHeatmapSection from '@/components/landing/PitchHeatmapSection'
import CTASection from '@/components/landing/CTASection'
import Footer from '@/components/landing/Footer'
import SmoothScroll from '@/components/landing/SmoothScroll'
import { WebApplicationSchema, OrganizationSchema, FAQSchema, SoftwareApplicationSchema } from '@/components/seo/JsonLd'

export default function LandingPage() {
  return (
    <SmoothScroll>
      <main className="cricv-root">
        <NavBar />
        <HeroSection />
        <SkeletonSection />
        <FeaturesSection />
        <HowItWorksSection />
        <StatsSection />
        <PitchHeatmapSection />
        <CTASection />
        
        {/* Step 11: FAQ Section */}
        <section id="faq" className="py-24 bg-slate-950">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl font-black text-white text-center mb-16 uppercase tracking-tight">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "Does CRIC-V require expensive hardware?",
                  a: "No. CRIC-V works with any standard HD camera, smartphone, or camcorder. It accepts MP4, MOV, and AVI video files. No specialized equipment required."
                },
                {
                  q: "Is CRIC-V free to use?",
                  a: "Yes, completely free. Create an account and start analyzing cricket technique immediately — no credit card, no trial period."
                },
                {
                  q: "How accurate is the ball tracking?",
                  a: "CRIC-V achieves over 95% ball detection accuracy using a custom-trained YOLOv8 model, with a color-based fallback system for challenging lighting."
                },
                {
                  q: "Does it check ICC bowling compliance?",
                  a: "Yes. CRIC-V automatically measures elbow extension at ball release. The ICC limit is 15 degrees — any delivery exceeding this is flagged as non-compliant."
                },
                {
                  q: "Who is CRIC-V built for?",
                  a: "Pakistani cricket coaches and academy directors who want professional-grade analysis without professional-grade costs. Works for players at all levels."
                },
                {
                  q: "Can I import videos from YouTube?",
                  a: "Yes. Paste any public YouTube URL of a cricket training video (max 10 minutes) and CRIC-V will download and analyze it automatically."
                }
              ].map((item, i) => (
                <details key={i} className="group bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <summary className="flex justify-between items-center p-6 cursor-pointer font-black text-white text-sm uppercase tracking-wide list-none">
                    {item.q}
                    <span className="text-green-500 group-open:rotate-45 transition-transform text-xl">+</span>
                  </summary>
                  <p className="px-6 pb-6 text-slate-400 text-sm leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Step 11: Hidden Keywords */}
        <p className="sr-only">
          CRIC-V is a free AI cricket coaching platform for Pakistan. Features include cricket biomechanical analysis,
          cricket pose estimation, YOLOv8 ball tracking, ICC elbow compliance checking, LSTM shot classification,
          pitch heatmaps, and AI drill recommendations. Built with MediaPipe, FastAPI, and Next.js.
          Developed by M. Talha Manzoor at Lahore Garrison University. Affordable alternative to Hawk-Eye
          cricket analysis for grassroots academies.
        </p>

        <Footer />
        
        {/* Step 5: Structured Data */}
        <WebApplicationSchema />
        <OrganizationSchema />
        <FAQSchema />
        <SoftwareApplicationSchema />
      </main>
    </SmoothScroll>
  )
}
