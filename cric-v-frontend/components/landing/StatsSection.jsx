'use client'

import { useEffect, useRef, useState } from 'react'

function Counter({ target, suffix, duration = 1800 }) {
    const [n, setN] = useState(0)
    const ref = useRef()
    const started = useRef(false)

    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting && !started.current) {
                started.current = true
                let start = 0
                const step = target / (duration / 16)
                const t = setInterval(() => {
                    start += step
                    if (start >= target) { setN(target); clearInterval(t) }
                    else setN(Math.floor(start))
                }, 16)
            }
        }, { threshold: 0.5 })
        if (ref.current) obs.observe(ref.current)
        return () => obs.disconnect()
    }, [target, duration])

    return <span ref={ref}>{n}{suffix}</span>
}

const STATS = [
    { n: 33, s: '', label: 'Body Keypoints', sub: 'tracked per frame', color: '#a8e063' },
    { n: 95, s: '%', label: 'Detection Accuracy', sub: 'for ball tracking', color: '#c9a84c' },
    { n: 6, s: '', label: 'Shot Types', sub: 'classified by LSTM', color: '#d64f2a' },
    { n: 15, s: '°', label: 'ICC Elbow Limit', sub: 'automatically enforced', color: '#8a9ba8' },
]

export default function StatsSection() {
    return (
        <section id="stats" style={{
            padding: '10rem max(2rem, 8vw)',
            background: '#060c10',
            position: 'relative', overflow: 'hidden',
        }}>
            {/* Dramatic background text */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                fontFamily: 'Syne, sans-serif', fontWeight: 800,
                fontSize: 'clamp(80px, 20vw, 280px)',
                color: 'rgba(168,224,99,0.03)',
                letterSpacing: '-0.05em', userSelect: 'none', whiteSpace: 'nowrap',
            }}>PRECISION</div>

            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', marginBottom: '6rem' }}>
                <div className="eyebrow fade-up" style={{ marginBottom: '16px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="hr-accent" /> By The Numbers <span className="hr-accent" />
                </div>
                <h2 className="display-lg fade-up" style={{ fontSize: 'clamp(36px, 4vw, 64px)', color: '#f5f0e8' }}>
                    Built on Precision
                </h2>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1px',
                background: 'rgba(245,240,232,0.05)',
                border: '1px solid rgba(245,240,232,0.05)',
                position: 'relative', zIndex: 2,
            }}>
                {STATS.map((s, i) => (
                    <div key={s.label} className="fade-up" style={{
                        padding: '48px 32px',
                        background: '#060c10',
                        textAlign: 'center',
                        position: 'relative',
                        transition: 'background 0.3s',
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = '#0a110a'}
                        onMouseLeave={e => e.currentTarget.style.background = '#060c10'}
                    >
                        {/* Corner accent top-left */}
                        <div style={{
                            position: 'absolute', top: '16px', left: '16px', width: '20px', height: '20px',
                            borderTop: `1px solid ${s.color}44`, borderLeft: `1px solid ${s.color}44`
                        }} />

                        <div style={{
                            fontFamily: 'Syne, sans-serif', fontWeight: 800,
                            fontSize: 'clamp(52px, 6vw, 80px)',
                            color: s.color, lineHeight: 1, marginBottom: '12px',
                            letterSpacing: '-0.03em',
                        }}>
                            <Counter target={s.n} suffix={s.s} />
                        </div>
                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '18px', color: '#f5f0e8', marginBottom: '6px' }}>
                            {s.label}
                        </div>
                        <div style={{ fontSize: '13px', color: 'rgba(245,240,232,0.35)', fontFamily: 'DM Sans, sans-serif' }}>
                            {s.sub}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}