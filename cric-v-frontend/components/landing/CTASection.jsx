'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

export default function CTASection() {
    const [scrollY, setScrollY] = useState(0)
    const ref = useRef()
    const [offset, setOffset] = useState(0)

    useEffect(() => {
        const handler = () => {
            if (!ref.current) return
            const rect = ref.current.getBoundingClientRect()
            setOffset(rect.top * 0.3)
        }
        window.addEventListener('scroll', handler)
        return () => window.removeEventListener('scroll', handler)
    }, [])

    return (
        <section ref={ref} style={{
            position: 'relative', minHeight: '90vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
        }}>
            {/* Stadium background with parallax */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url('https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=1800&q=80')`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                transform: `translateY(${offset}px)`,
                filter: 'brightness(0.15) saturate(0.3)',
            }} />

            {/* Gradient vignette */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(6,12,16,0) 0%, #060c10 100%)',
            }} />

            {/* Green radial glow */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse 40% 40% at 50% 50%, rgba(168,224,99,0.06) 0%, transparent 70%)',
            }} />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 max(2rem, 8vw)', maxWidth: '800px' }}>
                <div className="eyebrow fade-up" style={{ marginBottom: '24px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="hr-accent" /> Ready to Begin <span className="hr-accent" />
                </div>

                <h2 className="display-xl fade-up" style={{ fontSize: 'clamp(48px, 8vw, 100px)', color: '#f5f0e8', marginBottom: '16px' }}>
                    Walk Out to
                </h2>
                <h2 className="display-xl fade-up" style={{ fontSize: 'clamp(48px, 8vw, 100px)', color: '#a8e063', marginBottom: '40px' }}>
                    the Crease.
                </h2>

                <p className="body-text fade-up" style={{ fontSize: '18px', maxWidth: '500px', margin: '0 auto 56px', lineHeight: 1.6 }}>
                    Give your academy the same analytical power used by professional teams. No hardware. No complexity. Just better cricket.
                </p>

                <div className="fade-up" style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link href="/register" style={{
                        fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '14px',
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: '#060c10', background: '#a8e063',
                        padding: '20px 56px', textDecoration: 'none',
                        display: 'inline-block',
                        border: '1px solid #a8e063',
                        transition: 'all 0.3s',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a8e063' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#a8e063'; e.currentTarget.style.color = '#060c10' }}
                    >Create Free Account</Link>

                    <Link href="/login" style={{
                        fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '14px',
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: 'rgba(245,240,232,0.5)',
                        padding: '20px 56px', textDecoration: 'none',
                        display: 'inline-block',
                        border: '1px solid rgba(245,240,232,0.15)',
                        transition: 'all 0.3s',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,240,232,0.35)'; e.currentTarget.style.color = '#f5f0e8' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(245,240,232,0.15)'; e.currentTarget.style.color = 'rgba(245,240,232,0.5)' }}
                    >Sign In</Link>
                </div>
            </div>
        </section>
    )
}