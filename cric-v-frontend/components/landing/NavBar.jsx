'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function NavBar() {
    const [scrolled, setScrolled] = useState(false)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const s = () => setScrolled(window.scrollY > 60)
        window.addEventListener('scroll', s)
        return () => window.removeEventListener('scroll', s)
    }, [])

    return (
        <nav style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 2.5rem',
            height: '72px',
            background: scrolled ? 'rgba(6,12,16,0.92)' : 'transparent',
            backdropFilter: scrolled ? 'blur(20px)' : 'none',
            borderBottom: scrolled ? '1px solid rgba(168,224,99,0.08)' : '1px solid transparent',
            transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
        }}>
            {/* Logo */}
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="15" stroke="#a8e063" strokeWidth="1.5" />
                    <circle cx="16" cy="16" r="8" fill="#a8e063" opacity="0.15" />
                    <path d="M8 16 Q16 8 24 16 Q16 24 8 16Z" fill="#a8e063" opacity="0.6" />
                    <circle cx="16" cy="16" r="2" fill="#a8e063" />
                </svg>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '18px', color: '#f5f0e8', letterSpacing: '0.05em' }}>CRIC-V</span>
            </Link>

            {/* Desktop links */}
            <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
                {['Features', 'How It Works', 'Tech'].map(item => (
                    <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} style={{
                        fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 400,
                        color: 'rgba(245,240,232,0.55)', textDecoration: 'none',
                        transition: 'color 0.2s', letterSpacing: '0.02em',
                    }}
                        onMouseEnter={e => e.target.style.color = '#a8e063'}
                        onMouseLeave={e => e.target.style.color = 'rgba(245,240,232,0.55)'}
                    >{item}</a>
                ))}
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Link href="/login" style={{
                    fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(245,240,232,0.6)',
                    textDecoration: 'none', padding: '8px 16px',
                    transition: 'color 0.2s',
                }}
                    onMouseEnter={e => e.target.style.color = '#f5f0e8'}
                    onMouseLeave={e => e.target.style.color = 'rgba(245,240,232,0.6)'}
                >Sign In</Link>
                <Link href="/register" style={{
                    fontFamily: 'Syne, sans-serif', fontSize: '13px', fontWeight: 800,
                    color: '#060c10', background: '#a8e063',
                    padding: '10px 24px', borderRadius: '2px',
                    textDecoration: 'none', letterSpacing: '0.05em',
                    transition: 'background 0.2s, transform 0.2s',
                }}
                    onMouseEnter={e => { e.target.style.background = '#c9e89a'; e.target.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { e.target.style.background = '#a8e063'; e.target.style.transform = 'translateY(0)' }}
                >GET STARTED</Link>
            </div>
        </nav>
    )
}