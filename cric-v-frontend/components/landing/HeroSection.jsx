'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import Link from 'next/link'

// ── Realistic ICC Cricket Ball ────────────────────────────────────────────────
// Dukes/SG construction: two leather hemispheres, raised primary seam at equator,
// two quarter seams perpendicular, polished vs rough side texture difference
function CricketBall({ dragState, onPointerDown }) {
    const group = useRef()
    const body = useRef()
    const glowMesh = useRef()

    // Rotation accumulated from spin
    const rotationAccum = useRef(new THREE.Euler(0, 0, 0))
    const spinVel = useRef(new THREE.Vector2(0, 0))   // angular velocity from drag/throw
    const idlePhase = useRef(0)

    useFrame((state, delta) => {
        if (!group.current) return
        const t = state.clock.getElapsedTime()
        const ds = dragState.current

        // ── Position: driven by parent drag state ──
        group.current.position.set(ds.x, ds.y, 0)

        // ── Spin: accumulate from throw velocity when not dragging ──
        if (!ds.isDragging) {
            // Apply throw velocity as angular spin
            spinVel.current.x += ds.vy * 0.04
            spinVel.current.y += ds.vx * 0.04

            // Idle drift when throw dies down
            const speed = Math.sqrt(ds.vx ** 2 + ds.vy ** 2)
            if (speed < 0.01) {
                idlePhase.current += delta
                spinVel.current.x = Math.sin(idlePhase.current * 0.38) * 0.004
                spinVel.current.y = 0.003 + Math.sin(idlePhase.current * 0.22) * 0.001
            }

            // Dampen spin
            spinVel.current.x *= 0.97
            spinVel.current.y *= 0.97
        } else {
            // While dragging: spin hard based on drag delta
            spinVel.current.x = ds.vy * 0.18
            spinVel.current.y = ds.vx * 0.18
            idlePhase.current = t
        }

        rotationAccum.current.x += spinVel.current.x
        rotationAccum.current.y += spinVel.current.y

        group.current.rotation.x = rotationAccum.current.x
        group.current.rotation.y = rotationAccum.current.y

        // Glow pulse
        if (glowMesh.current) {
            const pulse = 0.055 + Math.sin(t * 0.8) * 0.02
            glowMesh.current.material.opacity = ds.isDragging ? pulse * 2.2 : pulse
        }
    })

    // Leather material — polished side (slightly shinier)
    const leatherPolished = {
        color: '#8b1a1a',
        roughness: 0.22,
        metalness: 0.06,
    }

    return (
        <group ref={group}>
            {/* ── Main sphere body ── */}
            <mesh ref={body} onPointerDown={onPointerDown} renderOrder={1}>
                <sphereGeometry args={[1.55, 128, 128]} />
                <meshStandardMaterial
                    color="#8b1a1a"
                    roughness={0.24}
                    metalness={0.07}
                />
            </mesh>

            {/* ── Leather seam line: hemisphere division (dark stitching backing) ── */}
            {/* The leather panels meet here; slightly recessed dark line */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[1.552, 0.028, 16, 200]} />
                <meshStandardMaterial color="#3d0a0a" roughness={0.95} metalness={0} />
            </mesh>

            {/* ── Primary raised seam: 6 rows of stitching ── */}
            {/* The actual raised seam is stitched with waxed linen thread */}
            {[-0.016, -0.005, 0.005, 0.016].map((offset, i) => (
                <mesh key={i} rotation={[0, 0, Math.PI / 2]}>
                    <torusGeometry args={[1.552 + Math.abs(offset) * 0.4, 0.009 - Math.abs(offset) * 0.1, 8, 200]} />
                    <meshStandardMaterial
                        color={i === 1 || i === 2 ? '#d4a574' : '#c49060'}
                        roughness={0.82}
                        metalness={0}
                    />
                </mesh>
            ))}

            {/* ── Raised seam ridge (the bump you can feel) ── */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[1.565, 0.018, 12, 200]} />
                <meshStandardMaterial color="#b8885a" roughness={0.78} metalness={0} />
            </mesh>

            {/* ── Quarter seam: one side (rough side hemisphere boundary) ── */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.552, 0.006, 8, 200]} />
                <meshStandardMaterial color="#5a1010" roughness={0.9} metalness={0} />
            </mesh>

            {/* ── Quarter seam cross-stitch marks (4 groups, each hemisphere) ── */}
            {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
                <group key={i} rotation={[0, angle, 0]}>
                    {/* Small stitch dots along quarter seam */}
                    {[-0.6, -0.3, 0, 0.3, 0.6].map((pos, j) => (
                        <mesh key={j} position={[1.558, pos * 0.18, pos * 0.96]}>
                            <sphereGeometry args={[0.013, 6, 6]} />
                            <meshStandardMaterial color="#c49060" roughness={0.85} />
                        </mesh>
                    ))}
                </group>
            ))}

            {/* ── Specular highlight patch (polished side) ── */}
            {/* One hemisphere is kept polished, the other is roughened — this creates */}
            {/* swing bowling physics. We simulate with a shinier hemisphere cap. */}
            <mesh rotation={[0, Math.PI, 0]}>
                <sphereGeometry args={[1.553, 64, 64, 0, Math.PI]} />
                <meshStandardMaterial
                    color="#a02020"
                    roughness={0.12}
                    metalness={0.14}
                    transparent
                    opacity={0.6}
                />
            </mesh>

            {/* ── Glow shell ── */}
            <mesh ref={glowMesh}>
                <sphereGeometry args={[2.05, 32, 32]} />
                <meshStandardMaterial
                    color="#c02828"
                    transparent
                    opacity={0.055}
                    side={THREE.BackSide}
                    depthWrite={false}
                />
            </mesh>
        </group>
    )
}

// ── Drag + Physics Controller ─────────────────────────────────────────────────
function DragController({ dragState, children }) {
    const { camera, gl, size } = useThree()
    const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0))
    const raycaster = useRef(new THREE.Raycaster())
    const isDragging = useRef(false)
    const lastMouse = useRef({ x: 0, y: 0 })
    const velHistory = useRef([])

    // Convert screen px → NDC → world XY
    const screenToWorld = useCallback((clientX, clientY) => {
        const rect = gl.domElement.getBoundingClientRect()
        const ndc = new THREE.Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1
        )
        raycaster.current.setFromCamera(ndc, camera)
        const target = new THREE.Vector3()
        raycaster.current.ray.intersectPlane(plane.current, target)
        return target
    }, [camera, gl])

    const handlePointerDown = useCallback((e) => {
        e.stopPropagation()
        isDragging.current = true
        dragState.current.isDragging = true
        velHistory.current = []
        lastMouse.current = { x: e.clientX, y: e.clientY }
        gl.domElement.style.cursor = 'grabbing'
    }, [dragState, gl])

    useEffect(() => {
        const el = gl.domElement

        const onMove = (e) => {
            if (!isDragging.current) return
            const clientX = e.touches ? e.touches[0].clientX : e.clientX
            const clientY = e.touches ? e.touches[0].clientY : e.clientY

            const world = screenToWorld(clientX, clientY)
            const dx = clientX - lastMouse.current.x
            const dy = clientY - lastMouse.current.y

            dragState.current.x = world.x
            dragState.current.y = world.y
            dragState.current.vx = dx * 0.025
            dragState.current.vy = -dy * 0.025

            velHistory.current.push({ vx: dx * 0.025, vy: -dy * 0.025, t: Date.now() })
            if (velHistory.current.length > 6) velHistory.current.shift()

            lastMouse.current = { x: clientX, y: clientY }
        }

        const onUp = () => {
            if (!isDragging.current) return
            isDragging.current = false
            dragState.current.isDragging = false
            gl.domElement.style.cursor = 'grab'

            // Use last N frames velocity for throw
            const recent = velHistory.current.filter(v => Date.now() - v.t < 80)
            if (recent.length > 0) {
                const avgVx = recent.reduce((s, v) => s + v.vx, 0) / recent.length
                const avgVy = recent.reduce((s, v) => s + v.vy, 0) / recent.length
                dragState.current.vx = avgVx * 2.2
                dragState.current.vy = avgVy * 2.2
            }
        }

        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        window.addEventListener('touchmove', onMove, { passive: false })
        window.addEventListener('touchend', onUp)
        return () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
            window.removeEventListener('touchmove', onMove)
            window.removeEventListener('touchend', onUp)
        }
    }, [dragState, gl, screenToWorld])

    // Physics tick — runs every frame
    useFrame((state, delta) => {
        const ds = dragState.current
        if (ds.isDragging) return

        // 1. Boundary limits & bounce (Heavier, duller feel like a cricket ball)
        const bx = 3.2, by = 2.0
        if (Math.abs(ds.x) > bx) {
            ds.vx *= -0.25 // Duller bounce on walls
            ds.x = Math.sign(ds.x) * bx
        }
        if (Math.abs(ds.y) > by) {
            ds.vy *= -0.3 // Duller bounce (cricket balls don't bounce high)
            ds.y = Math.sign(ds.y) * by
            // Stop small bounces quickly to feel "thuddy"
            if (Math.abs(ds.vy) < 0.05) ds.vy = 0
        }

        // 2. Inertia
        ds.x += ds.vx
        ds.y += ds.vy

        // 3. Force Application (Heavier gravity, no mid-air floating)
        const speed = Math.sqrt(ds.vx ** 2 + ds.vy ** 2)
        const atBase = ds.y <= -by + 0.01

        if (atBase && speed < 0.06) {
            // Settle mode: at the base, stop gravity and center horizontally
            ds.y = -by
            ds.vy = 0
            ds.vx *= 0.8 // High floor friction
            ds.x += (0 - ds.x) * 0.015
        } else {
            // Active mode: Heavier gravity, dense ball (less air damping)
            ds.vy -= 0.0042 // Significantly heavier
            ds.vx *= 0.99   // Less air resistance
            ds.vy *= 0.99
        }
    })

    return <group onPointerDown={handlePointerDown}>{children}</group>
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function Scene({ dragState }) {
    const { gl } = useThree()

    const handlePointerDown = useCallback((e) => {
        // Handled by DragController
    }, [])

    useEffect(() => {
        gl.domElement.style.cursor = 'grab'
    }, [gl])

    return (
        <>
            <ambientLight intensity={0.18} />
            {/* Main key light — stadium floodlight warm white */}
            <directionalLight position={[5, 8, 4]} intensity={2.6} color="#fff8f0" castShadow />
            {/* Fill from opposite — cooler */}
            <directionalLight position={[-4, -1, 2]} intensity={0.35} color="#c0d0e0" />
            {/* Red bounce — simulates the red leather's bounce light */}
            <pointLight position={[0, -3, 2]} intensity={0.9} color="#8b1a1a" />
            {/* Rim light */}
            <pointLight position={[-3, 4, -1]} intensity={0.7} color="#ffe8c0" />
            {/* Back rim */}
            <pointLight position={[2, -2, -3]} intensity={0.4} color="#ff6040" />

            <DragController dragState={dragState}>
                <CricketBall dragState={dragState} onPointerDown={handlePointerDown} />
            </DragController>

            <Stars radius={30} depth={12} count={900} factor={0.35} saturation={0} fade />
        </>
    )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function HeroSection() {
    const [scrollY, setScrollY] = useState(0)

    // Shared mutable drag state — avoids React re-render on every frame
    const dragState = useRef({
        x: 0, y: 0,
        vx: 0, vy: 0,
        isDragging: false,
    })

    useEffect(() => {
        const onScroll = () => setScrollY(window.scrollY)
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    const heroFade = Math.max(0, 1 - scrollY / 480)
    const heroLift = scrollY * 0.15

    return (
        <section style={{
            position: 'relative',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            background: '#060c10',
        }}>

            {/* Stadium BG */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1800&q=80')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 30%',
                transform: `translateY(${scrollY * 0.35}px)`,
                filter: 'brightness(0.1) saturate(0.3)',
            }} />

            {/* Vignette */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, #060c10 80%)',
            }} />
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, #060c10 0%, transparent 18%, transparent 72%, #060c10 100%)',
            }} />

            {/* CRIC-V ghost text — behind the ball */}
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 1,
                opacity: heroFade,
                transform: `translateY(-${heroLift}px)`,
            }}>
                <div style={{
                    fontFamily: 'Syne, sans-serif',
                    fontWeight: 800,
                    fontSize: 'clamp(100px, 21vw, 250px)',
                    letterSpacing: '-0.02em',
                    lineHeight: 0.88,
                    color: 'rgba(245, 240, 232, 0.58)',
                    userSelect: 'none',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                }}>
                    CRIC-V
                </div>
            </div>

            {/* Three.js Canvas — pointer-events ON so ball is draggable */}
            <div style={{
                position: 'absolute', inset: 0,
                zIndex: 2,
                opacity: heroFade,
            }}>
                <Canvas
                    camera={{ position: [0, 0, 5.5], fov: 38 }}
                    gl={{ antialias: true, alpha: true }}
                >
                    <Scene dragState={dragState} />
                </Canvas>
            </div>

            {/* Foreground UI — above the canvas but pointer-events off at section level */}
            <div style={{
                position: 'relative',
                zIndex: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '0 24px',
                opacity: heroFade,
                transform: `translateY(-${heroLift}px)`,
                marginTop: 'clamp(280px, 38vh, 420px)',
                pointerEvents: 'none',
            }}>

                {/* Eyebrow */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    marginBottom: '22px',
                    fontFamily: 'Syne, sans-serif',
                    fontSize: '10px',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    color: 'rgba(245, 240, 232, 0.48)',
                }}>
                    <span style={{ width: '28px', height: '1px', background: 'rgba(168,224,99,0.6)', display: 'inline-block' }} />
                    AI-Powered Cricket Intelligence
                    <span style={{ width: '28px', height: '1px', background: 'rgba(168,224,99,0.6)', display: 'inline-block' }} />
                </div>

                {/* Tagline */}
                <p style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 'clamp(15px, 1.6vw, 18px)',
                    color: 'rgba(245,240,232,0.45)',
                    maxWidth: '400px',
                    lineHeight: 1.7,
                    marginBottom: '36px',
                    letterSpacing: '0.01em',
                }}>
                    Professional biomechanical analysis for grassroots cricket.
                    Upload footage. Get instant AI coaching.
                </p>

                {/* CTAs — pointer-events restored */}
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', pointerEvents: 'auto' }}>
                    <Link
                        href="/register"
                        style={{
                            fontFamily: 'Syne, sans-serif', fontWeight: 700,
                            fontSize: '11px', letterSpacing: '0.15em',
                            textTransform: 'uppercase', textDecoration: 'none',
                            color: '#060c10', background: '#a8e063',
                            padding: '16px 44px',
                            border: '1px solid #a8e063',
                            transition: 'all 0.4s cubic-bezier(0.23,1,0.32,1)',
                            display: 'inline-block',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a8e063' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#a8e063'; e.currentTarget.style.color = '#060c10' }}
                    >
                        Start Analyzing →
                    </Link>
                    <Link
                        href="/login"
                        style={{
                            fontFamily: 'Syne, sans-serif', fontWeight: 700,
                            fontSize: '11px', letterSpacing: '0.15em',
                            textTransform: 'uppercase', textDecoration: 'none',
                            color: 'rgba(245,240,232,0.4)',
                            padding: '16px 44px',
                            border: '1px solid rgba(245,240,232,0.12)',
                            transition: 'all 0.4s cubic-bezier(0.23,1,0.32,1)',
                            display: 'inline-block',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,240,232,0.3)'; e.currentTarget.style.color = '#f5f0e8' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(245,240,232,0.12)'; e.currentTarget.style.color = 'rgba(245,240,232,0.4)' }}
                    >
                        Sign In
                    </Link>
                </div>
            </div>

            {/* Drag hint */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, calc(-50% + 130px))',
                zIndex: 4,
                pointerEvents: 'none',
                opacity: Math.max(0, 1 - scrollY / 150),
                transition: 'opacity 0.5s',
            }}>
                <span style={{
                    fontFamily: 'Syne, sans-serif', fontSize: '9px',
                    letterSpacing: '0.3em', textTransform: 'uppercase',
                    color: 'rgba(245,240,232,0.18)',
                }}>
                    drag to throw
                </span>
            </div>

            {/* Scroll indicator */}
            <div style={{
                position: 'absolute', bottom: '32px', left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                opacity: Math.max(0, 1 - scrollY / 180),
                zIndex: 10,
                pointerEvents: 'none',
            }}>
                <span style={{
                    fontFamily: 'Syne, sans-serif', fontSize: '9px',
                    letterSpacing: '0.35em', color: 'rgba(245,240,232,0.2)',
                    textTransform: 'uppercase',
                }}>Scroll</span>
                <div style={{
                    width: '1px', height: '52px',
                    background: 'linear-gradient(to bottom, rgba(168,224,99,0.4), transparent)',
                    animation: 'scrollPulse 2.2s ease-in-out infinite',
                }} />
            </div>

            <style>{`
        @keyframes scrollPulse {
          0%, 100% { opacity: 0.25; transform: scaleY(1); }
          50% { opacity: 0.9; transform: scaleY(1.08); }
        }
      `}</style>
        </section>
    )
}