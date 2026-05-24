'use client'

import { useState } from 'react'

const ZONES = [
    { id: 'yo', label: 'Yorker', x: 8, y: 80, w: 84, h: 12, heat: 0.4, color: '#a8e063', desc: 'Full pitched, great for LBWs' },
    { id: 'full', label: 'Full', x: 8, y: 63, w: 84, h: 15, heat: 0.7, color: '#c9a84c', desc: 'Driving zone — fuller length' },
    { id: 'good', label: 'Good Length', x: 8, y: 42, w: 84, h: 19, heat: 0.95, color: '#d64f2a', desc: 'Optimal bowling zone — most wickets taken here' },
    { id: 'short', label: 'Short of Length', x: 8, y: 26, w: 84, h: 14, heat: 0.6, color: '#c9a84c', desc: 'Cutting zone — forces awkward shots' },
    { id: 'bouncer', label: 'Bouncer', x: 8, y: 10, w: 84, h: 14, heat: 0.3, color: '#8a9ba8', desc: 'Short ball — tests technique' },
]

function heatColor(heat) {
    if (heat > 0.85) return 'rgba(214,79,42,0.75)'
    if (heat > 0.6) return 'rgba(201,168,76,0.6)'
    if (heat > 0.35) return 'rgba(168,224,99,0.5)'
    return 'rgba(138,155,168,0.3)'
}

export default function PitchHeatmapSection() {
    const [hovered, setHovered] = useState(null)
    const [line, setLine] = useState('center')

    const LINES = {
        center: { label: 'Stump Line', xOff: 0 },
        offside: { label: 'Off Stump', xOff: -15 },
        legside: { label: 'Leg Stump', xOff: 15 },
    }

    return (
        <section id="pitch" style={{
            padding: '10rem max(2rem, 8vw)',
            background: 'linear-gradient(to bottom, #060c10, #071209)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '5rem',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Left: Text */}
            <div>
                <div className="eyebrow fade-up" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="hr-accent" /> Pitch Heatmaps
                </div>
                <h2 className="display-lg fade-up" style={{ fontSize: 'clamp(36px, 4vw, 60px)', color: '#f5f0e8', marginBottom: '24px' }}>
                    Where Does Your<br />
                    <em style={{ color: '#a8e063' }}>Bowler Land It?</em>
                </h2>
                <p className="body-text fade-up" style={{ fontSize: '16px', marginBottom: '40px' }}>
                    Visual delivery maps reveal line-and-length patterns across a session. Coaches instantly see where consistency breaks down — and where wickets are being left on the pitch.
                </p>

                {/* Line selector */}
                <div className="fade-up" style={{ marginBottom: '32px' }}>
                    <div style={{ fontSize: '12px', fontFamily: 'Syne, sans-serif', fontWeight: 800, letterSpacing: '0.15em', color: 'rgba(245,240,232,0.3)', marginBottom: '12px' }}>
                        DELIVERY LINE
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {Object.entries(LINES).map(([k, v]) => (
                            <button key={k} onClick={() => setLine(k)} style={{
                                fontFamily: 'Syne, sans-serif', fontSize: '12px', fontWeight: 800,
                                letterSpacing: '0.08em',
                                padding: '8px 16px',
                                background: line === k ? '#a8e063' : 'transparent',
                                color: line === k ? '#060c10' : 'rgba(245,240,232,0.4)',
                                border: `1px solid ${line === k ? '#a8e063' : 'rgba(245,240,232,0.1)'}`,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}>{v.label}</button>
                        ))}
                    </div>
                </div>

                {/* Zone legend */}
                {hovered && (
                    <div style={{
                        padding: '20px 24px',
                        border: '1px solid rgba(168,224,99,0.2)',
                        background: 'rgba(168,224,99,0.05)',
                        animation: 'fadeIn 0.3s ease',
                    }}>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 800, color: hovered.color, marginBottom: '6px' }}>
                            {hovered.label} Zone
                        </div>
                        <div style={{ fontSize: '14px', color: 'rgba(245,240,232,0.55)', fontFamily: 'DM Sans, sans-serif' }}>
                            {hovered.desc}
                        </div>
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ flex: 1, height: '4px', background: 'rgba(245,240,232,0.08)' }}>
                                <div style={{ width: `${hovered.heat * 100}%`, height: '100%', background: hovered.color, transition: 'width 0.5s' }} />
                            </div>
                            <span style={{ fontSize: '12px', color: hovered.color, fontFamily: 'Syne, sans-serif', fontWeight: 800 }}>{Math.round(hovered.heat * 100)}%</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Right: Pitch visualization */}
            <div className="fade-up" style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <div style={{
                    width: '260px',
                    background: '#0f2016',
                    border: '1px solid rgba(168,224,99,0.1)',
                    position: 'relative',
                    padding: '16px',
                }}>
                    {/* Crease lines */}
                    <div style={{ position: 'relative', height: '480px' }}>
                        {/* Pitch surface */}
                        <div style={{
                            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                            width: '80%', top: '5%', bottom: '5%',
                            background: 'rgba(139,100,20,0.15)',
                            border: '1px solid rgba(139,100,20,0.3)',
                        }} />

                        {/* Crease lines */}
                        <div style={{ position: 'absolute', left: 0, right: 0, top: '8%', height: '1px', background: 'rgba(245,240,232,0.2)' }} />
                        <div style={{ position: 'absolute', left: 0, right: 0, bottom: '8%', height: '1px', background: 'rgba(245,240,232,0.2)' }} />

                        {/* Zones */}
                        {ZONES.map(z => (
                            <div key={z.id}
                                onMouseEnter={() => setHovered(z)}
                                onMouseLeave={() => setHovered(null)}
                                style={{
                                    position: 'absolute',
                                    left: `${z.x + LINES[line].xOff * 0.3}%`,
                                    top: `${z.y}%`,
                                    width: `${z.w}%`,
                                    height: `${z.h}%`,
                                    background: hovered?.id === z.id ? heatColor(z.heat).replace(')', ', 1.2)') : heatColor(z.heat),
                                    border: hovered?.id === z.id ? `1px solid ${z.color}` : '1px solid transparent',
                                    cursor: 'crosshair',
                                    transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                <span style={{
                                    fontSize: '10px', fontFamily: 'Syne, sans-serif', fontWeight: 800,
                                    color: z.color, letterSpacing: '0.05em', opacity: 0.7,
                                }}>{z.label}</span>
                            </div>
                        ))}

                        {/* Stump indicators */}
                        {[-1, 0, 1].map(s => (
                            <div key={s} style={{
                                position: 'absolute',
                                left: `calc(50% + ${s * 8 + LINES[line].xOff * 0.5}px)`,
                                bottom: '2%', width: '2px', height: '16px',
                                background: 'rgba(245,240,232,0.6)',
                                transform: 'translateX(-50%)',
                            }} />
                        ))}
                    </div>

                    {/* Labels */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(245,240,232,0.3)', fontFamily: 'DM Sans, sans-serif' }}>Bowler&apos;s End</span>
                        <span style={{ fontSize: '10px', color: 'rgba(245,240,232,0.3)', fontFamily: 'DM Sans, sans-serif' }}>Batsman&apos;s End</span>
                    </div>
                </div>

                {/* Legend */}
                <div style={{ position: 'absolute', right: '-40px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[
                        { c: 'rgba(214,79,42,0.75)', l: 'Hot' },
                        { c: 'rgba(201,168,76,0.6)', l: 'Warm' },
                        { c: 'rgba(168,224,99,0.5)', l: 'Mild' },
                        { c: 'rgba(138,155,168,0.3)', l: 'Cool' },
                    ].map(({ c, l }) => (
                        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '8px', height: '8px', background: c }} />
                            <span style={{ fontSize: '9px', color: 'rgba(245,240,232,0.4)', fontFamily: 'DM Sans, sans-serif' }}>{l}</span>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @media (max-width: 900px) {
          section { grid-template-columns: 1fr !important; }
        }
      `}</style>
        </section>
    )
}