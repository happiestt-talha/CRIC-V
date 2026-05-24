'use client'

import { useState } from 'react'

const FEATURES = [
    {
        num: '01',
        icon: '◎',
        title: 'Ball Tracking',
        sub: 'YOLOv8 Detection',
        desc: 'Frame-by-frame ball detection calculates speed, swing, seam position, and delivery trajectory with sub-pixel precision.',
        color: '#d64f2a',
        img: 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=600&q=80',
    },
    {
        num: '02',
        icon: '⟳',
        title: 'Shot Classification',
        sub: 'LSTM Neural Network',
        desc: 'Cover drives, pull shots, cuts, sweeps — our LSTM classifier identifies 6 shot types and scores technique quality.',
        color: '#c9a84c',
        img: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&q=80',
    },
    {
        num: '03',
        icon: '▦',
        title: 'Pitch Heatmaps',
        sub: 'Visual Delivery Maps',
        desc: 'Color-coded delivery maps expose line and length patterns. Bowlers see exactly where their consistency breaks down.',
        color: '#a8e063',
        img: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600&q=80',
    },
    {
        num: '04',
        icon: '⚖',
        title: 'ICC Compliance',
        sub: 'Elbow Angle Analysis',
        desc: 'Automatic detection of illegal bowling actions. The system flags elbow extension beyond the 15° ICC limit instantly.',
        color: '#8a9ba8',
        img: 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=600&q=80',
    },
    {
        num: '05',
        icon: '💡',
        title: 'AI Coaching Tips',
        sub: 'Drill Recommendations',
        desc: 'Rule-based coaching engine maps each detected weakness to specific drills — personalized training, automatically generated.',
        color: '#a8e063',
        img: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&q=80',
    },
    {
        num: '06',
        icon: '☰',
        title: 'Performance Reports',
        sub: 'Session Analytics',
        desc: 'Comprehensive session reports with annotated video, trend graphs, and shareable PDF exports for every player.',
        color: '#c9a84c',
        img: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600&q=80',
    },
]

export default function FeaturesSection() {
    const [active, setActive] = useState(0)
    const f = FEATURES[active]

    return (
        <section id="features" style={{
            minHeight: '100vh', display: 'flex',
            flexDirection: 'column', justifyContent: 'center',
            padding: '8rem max(2rem, 8vw)',
            background: '#060c10',
            position: 'relative',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '5rem', flexWrap: 'wrap', gap: '2rem' }}>
                <div>
                    <div className="eyebrow fade-up" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="hr-accent" /> What CRIC-V Does
                    </div>
                    <h2 className="display-lg fade-up" style={{ fontSize: 'clamp(36px, 4vw, 64px)', color: '#f5f0e8' }}>
                        Six Modules.<br />
                        <em style={{ color: 'rgba(245,240,232,0.3)' }}>One Platform.</em>
                    </h2>
                </div>
                <p className="body-text fade-up" style={{ maxWidth: '360px', fontSize: '15px' }}>
                    Every tool a professional cricket coach needs — now accessible to grassroots academies across Pakistan.
                </p>
            </div>

            {/* Feature layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start' }}>
                {/* Left: feature list */}
                <div>
                    {FEATURES.map((feat, i) => (
                        <div key={feat.num}
                            onClick={() => setActive(i)}
                            style={{
                                display: 'flex', gap: '24px', alignItems: 'flex-start',
                                padding: '24px 0',
                                borderTop: '1px solid rgba(245,240,232,0.06)',
                                cursor: 'pointer',
                                transition: 'opacity 0.3s',
                                opacity: active === i ? 1 : 0.45,
                            }}
                            onMouseEnter={e => setActive(i)}
                        >
                            <span style={{
                                fontFamily: 'Syne, sans-serif', fontSize: '11px', fontWeight: 800,
                                color: active === i ? feat.color : 'rgba(245,240,232,0.25)',
                                letterSpacing: '0.1em', minWidth: '28px', paddingTop: '3px',
                                transition: 'color 0.3s',
                            }}>{feat.num}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '6px' }}>
                                    <h3 style={{
                                        fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 800,
                                        color: active === i ? '#f5f0e8' : 'rgba(245,240,232,0.7)',
                                        transition: 'color 0.3s',
                                    }}>{feat.title}</h3>
                                    <span style={{
                                        fontSize: '11px', fontFamily: 'DM Sans, sans-serif',
                                        color: feat.color, opacity: active === i ? 0.8 : 0,
                                        transition: 'opacity 0.3s',
                                    }}>{feat.sub}</span>
                                </div>
                                {active === i && (
                                    <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.45)', lineHeight: 1.6, fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                                        {feat.desc}
                                    </p>
                                )}
                            </div>
                            {/* Active bar */}
                            <div style={{
                                width: '2px', alignSelf: 'stretch',
                                background: active === i ? feat.color : 'transparent',
                                transition: 'background 0.3s',
                            }} />
                        </div>
                    ))}
                </div>

                {/* Right: preview image */}
                <div style={{
                    position: 'sticky', top: '120px',
                    height: '500px',
                    overflow: 'hidden',
                    border: '1px solid rgba(245,240,232,0.06)',
                }}>
                    <div key={active} style={{
                        position: 'absolute', inset: 0,
                        backgroundImage: `url('${f.img}')`,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                        filter: 'brightness(0.35) saturate(0.6)',
                        animation: 'fadeIn 0.5s ease',
                    }} />
                    {/* Overlay grid */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        backgroundImage: 'linear-gradient(rgba(168,224,99,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(168,224,99,0.05) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                    }} />
                    {/* Info overlay */}
                    <div style={{ position: 'absolute', bottom: '32px', left: '32px', right: '32px' }}>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '11px', fontWeight: 800, letterSpacing: '0.2em', color: f.color, marginBottom: '8px' }}>
                            MODULE {f.num}
                        </div>
                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 700, color: '#f5f0e8' }}>
                            {f.title}
                        </div>
                    </div>
                    {/* Corner accent */}
                    <div style={{
                        position: 'absolute', top: '24px', right: '24px', width: '40px', height: '40px',
                        borderTop: `2px solid ${f.color}`, borderRight: `2px solid ${f.color}`
                    }} />
                    <div style={{
                        position: 'absolute', bottom: '24px', left: '24px', width: '40px', height: '40px',
                        borderBottom: `2px solid ${f.color}`, borderLeft: `2px solid ${f.color}`
                    }} />
                </div>
            </div>

            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(1.03); } to { opacity: 1; transform: scale(1); } }
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
        </section>
    )
}