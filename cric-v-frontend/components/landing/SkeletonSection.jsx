'use client'

import { useEffect, useRef, useState } from 'react'

const JOINTS = [
    // Head / torso
    { id: 0, x: 50, y: 5, label: 'Head' },
    { id: 1, x: 50, y: 13, label: 'Neck' },
    { id: 2, x: 38, y: 13, label: 'L Shoulder' },
    { id: 3, x: 62, y: 13, label: 'R Shoulder' },
    { id: 4, x: 28, y: 24, label: 'L Elbow' },
    { id: 5, x: 72, y: 24, label: 'R Elbow' },
    { id: 6, x: 20, y: 35, label: 'L Wrist' },
    { id: 7, x: 80, y: 35, label: 'R Wrist' },
    { id: 8, x: 42, y: 32, label: 'L Hip' },
    { id: 9, x: 58, y: 32, label: 'R Hip' },
    { id: 10, x: 40, y: 52, label: 'L Knee' },
    { id: 11, x: 60, y: 52, label: 'R Knee' },
    { id: 12, x: 38, y: 72, label: 'L Ankle' },
    { id: 13, x: 62, y: 72, label: 'R Ankle' },
    { id: 14, x: 36, y: 80, label: 'L Foot' },
    { id: 15, x: 64, y: 80, label: 'R Foot' },
]

const BONES = [
    [0, 1], [1, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7],
    [2, 8], [3, 9], [8, 9], [8, 10], [9, 11], [10, 12], [11, 13], [12, 14], [13, 15],
]

export default function SkeletonSection() {
    const ref = useRef(null)
    const [visible, setVisible] = useState(false)
    const [activeJoints, setActiveJoints] = useState([])
    const [hovered, setHovered] = useState(null)

    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) setVisible(true)
        }, { threshold: 0.3 })
        if (ref.current) obs.observe(ref.current)
        return () => obs.disconnect()
    }, [])

    useEffect(() => {
        if (!visible) return
        JOINTS.forEach((j, i) => {
            setTimeout(() => setActiveJoints(prev => [...prev, j.id]), i * 80)
        })
    }, [visible])

    return (
        <section ref={ref} style={{
            minHeight: '100vh',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            alignItems: 'center',
            padding: '0 max(2rem, 8vw)',
            gap: '4rem',
            background: 'linear-gradient(to bottom, #060c10, #0a1a0f, #060c10)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background pitch lines */}
            <div style={{
                position: 'absolute', inset: 0, opacity: 0.04,
                backgroundImage: 'repeating-linear-gradient(90deg, #a8e063 0, #a8e063 1px, transparent 1px, transparent 80px)',
            }} />

            {/* Left: Text */}
            <div>
                <div className="eyebrow fade-up" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="hr-accent" />
                    Pose Estimation
                </div>
                <h2 className="display-lg fade-up" style={{ fontSize: 'clamp(36px, 4vw, 60px)', color: '#f5f0e8', marginBottom: '24px' }}>
                    Every Joint.<br />
                    <em style={{ color: '#a8e063' }}>Every Frame.</em>
                </h2>
                <p className="body-text fade-up" style={{ fontSize: '16px', marginBottom: '40px' }}>
                    MediaPipe extracts 33 biomechanical keypoints per frame — shoulders, elbows, wrists, hips, knees. Our engine tracks technique in real time, flagging form deviations the eye can&apos;t catch.
                </p>

                <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {[
                        { n: '33', l: 'Keypoints tracked per frame' },
                        { n: '60fps', l: 'Real-time processing speed' },
                        { n: '<200ms', l: 'Analysis latency' },
                        { n: '±2°', l: 'Angular measurement precision' },
                    ].map(s => (
                        <div key={s.l} style={{
                            padding: '20px',
                            border: '1px solid rgba(168,224,99,0.12)',
                            background: 'rgba(168,224,99,0.03)',
                        }}>
                            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '28px', color: '#a8e063', marginBottom: '4px' }}>{s.n}</div>
                            <div style={{ fontSize: '13px', color: 'rgba(245,240,232,0.4)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.4 }}>{s.l}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Skeleton viz */}
            <div style={{ position: 'relative', height: '500px' }}>
                {/* Batsman silhouette background */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url('https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&q=80')`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    filter: 'brightness(0.12) saturate(0)',
                    opacity: 0.7,
                }} />

                {/* SVG skeleton overlay */}
                <svg viewBox="0 0 100 85" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                    {/* Bones */}
                    {BONES.map(([a, b]) => {
                        const ja = JOINTS[a], jb = JOINTS[b]
                        const both = activeJoints.includes(a) && activeJoints.includes(b)
                        return (
                            <line key={`${a}-${b}`}
                                x1={ja.x} y1={ja.y} x2={jb.x} y2={jb.y}
                                stroke={both ? 'rgba(168,224,99,0.5)' : 'transparent'}
                                strokeWidth="0.5"
                                style={{ transition: 'stroke 0.3s' }}
                            />
                        )
                    })}

                    {/* Joints */}
                    {JOINTS.map(j => (
                        <g key={j.id}
                            onMouseEnter={() => setHovered(j)}
                            onMouseLeave={() => setHovered(null)}
                            style={{ cursor: 'crosshair' }}
                        >
                            {/* Pulse ring */}
                            {activeJoints.includes(j.id) && (
                                <circle cx={j.x} cy={j.y} r="2.5"
                                    fill="none" stroke="#a8e063" strokeWidth="0.3" opacity="0.4">
                                    <animate attributeName="r" values="1.5;3.5;1.5" dur="2s" repeatCount="indefinite" />
                                    <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                                </circle>
                            )}
                            {/* Joint dot */}
                            <circle cx={j.x} cy={j.y} r="1.2"
                                fill={activeJoints.includes(j.id) ? '#a8e063' : 'transparent'}
                                style={{ transition: 'fill 0.2s' }}
                            />
                            {/* Hover label */}
                            {hovered?.id === j.id && (
                                <text x={j.x + 2} y={j.y - 1.5}
                                    fontSize="3" fill="#a8e063"
                                    fontFamily="Syne, sans-serif"
                                >{j.label}</text>
                            )}
                        </g>
                    ))}
                </svg>

                {/* Scan line effect */}
                {visible && (
                    <div style={{
                        position: 'absolute', left: 0, right: 0, height: '2px',
                        background: 'linear-gradient(to right, transparent, rgba(168,224,99,0.6), transparent)',
                        animation: 'scan 2.5s ease-in-out forwards',
                    }} />
                )}
            </div>

            <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @media (max-width: 768px) {
          section { grid-template-columns: 1fr !important; }
        }
      `}</style>
        </section>
    )
}