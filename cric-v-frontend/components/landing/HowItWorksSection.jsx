'use client'

import { useRef, useEffect, useState } from 'react'

const STEPS = [
    {
        n: '01',
        title: 'Record',
        headline: 'Any HD Camera Will Do.',
        desc: 'No special hardware required. Coaches record training sessions with a phone or standard camcorder from any angle. CRIC-V handles the rest.',
        detail: ['Supports MP4, MOV, AVI formats', 'Minimum 720p resolution', 'Works with single or multi-camera setups', 'Batch upload multiple sessions'],
        color: '#a8e063',
        bg: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80',
    },
    {
        n: '02',
        title: 'Analyze',
        headline: 'Three AI Systems. Simultaneously.',
        desc: 'MediaPipe extracts pose keypoints. YOLOv8 tracks the ball. Our LSTM classifies shots and deliveries — all running in parallel on every frame.',
        detail: ['33 skeletal keypoints per frame', 'YOLOv8 ball at 95%+ accuracy', 'LSTM shot classifier (6 classes)', 'ICC elbow angle compliance check'],
        color: '#c9a84c',
        bg: 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=800&q=80',
    },
    {
        n: '03',
        title: 'Improve',
        headline: 'Data Becomes Coaching.',
        desc: 'Receive annotated video with skeleton overlay, pitch heatmaps, quality scores, and drill recommendations — all in a shareable report.',
        detail: ['Annotated video with skeleton overlay', 'Interactive pitch heatmap', 'Per-shot quality scores 0–100', 'AI-generated drill recommendations'],
        color: '#d64f2a',
        bg: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80',
    },
]

export default function HowItWorksSection() {
    const [active, setActive] = useState(0)
    const refs = useRef([])

    useEffect(() => {
        const observers = refs.current.map((ref, i) => {
            if (!ref) return null
            const obs = new IntersectionObserver(([e]) => {
                if (e.isIntersecting) setActive(i)
            }, { threshold: 0.5 })
            obs.observe(ref)
            return obs
        })
        return () => observers.forEach(o => o?.disconnect())
    }, [])

    return (
        <section id="how-it-works" style={{ background: '#0a0f08', position: 'relative' }}>
            {/* Sticky image panel (desktop) */}
            <div style={{
                position: 'sticky', top: 0, height: '100vh',
                backgroundImage: `url('${STEPS[active].bg}')`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                filter: 'brightness(0.2) saturate(0.4)',
                transition: 'background-image 0.6s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <div style={{
                    fontFamily: 'Syne, sans-serif', fontSize: 'clamp(80px, 15vw, 200px)',
                    fontWeight: 800, color: STEPS[active].color,
                    opacity: 0.07, letterSpacing: '-0.05em', userSelect: 'none',
                }}>{STEPS[active].n}</div>
            </div>

            {/* Scrollable content */}
            <div style={{ marginTop: '-100vh' }}>
                {/* Header */}
                <div style={{ padding: '8rem max(2rem, 8vw) 4rem', position: 'relative', zIndex: 2 }}>
                    <div className="eyebrow fade-up" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="hr-accent" /> Simple Process
                    </div>
                    <h2 className="display-lg fade-up" style={{ fontSize: 'clamp(36px, 4vw, 64px)', color: '#f5f0e8' }}>
                        From Footage<br />
                        <em style={{ color: 'rgba(245,240,232,0.25)' }}>to Feedback.</em>
                    </h2>
                </div>

                {/* Steps */}
                {STEPS.map((step, i) => (
                    <div key={step.n} ref={el => refs.current[i] = el}
                        style={{
                            minHeight: '80vh', display: 'flex', alignItems: 'center',
                            padding: '6rem max(2rem, 8vw)',
                            position: 'relative', zIndex: 2,
                        }}>
                        <div style={{ maxWidth: '560px' }}>
                            <div style={{
                                fontFamily: 'Syne, sans-serif', fontSize: '72px', fontWeight: 800,
                                color: step.color, opacity: 0.15, lineHeight: 1, marginBottom: '-20px',
                            }}>{step.n}</div>

                            <div style={{
                                display: 'inline-block',
                                fontFamily: 'Syne, sans-serif', fontSize: '11px', fontWeight: 800,
                                letterSpacing: '0.2em', color: step.color,
                                border: `1px solid ${step.color}33`,
                                padding: '6px 14px', marginBottom: '20px',
                            }}>STEP {step.n}</div>

                            <h3 style={{
                                fontFamily: 'Playfair Display, serif', fontWeight: 700,
                                fontSize: 'clamp(28px, 3vw, 44px)', color: '#f5f0e8',
                                marginBottom: '20px', lineHeight: 1.2,
                            }}>{step.headline}</h3>

                            <p style={{ fontSize: '16px', color: 'rgba(245,240,232,0.5)', lineHeight: 1.7, fontFamily: 'DM Sans, sans-serif', fontWeight: 300, marginBottom: '32px' }}>
                                {step.desc}
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {step.detail.map((d, di) => (
                                    <div key={di} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div style={{ width: '6px', height: '6px', background: step.color, flexShrink: 0 }} />
                                        <span style={{ fontSize: '14px', color: 'rgba(245,240,232,0.55)', fontFamily: 'DM Sans, sans-serif' }}>{d}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}