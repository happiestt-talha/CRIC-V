import Link from 'next/link'

export default function Footer() {
    return (
        <footer style={{
            padding: '4rem max(2rem, 8vw)',
            borderTop: '1px solid rgba(245,240,232,0.05)',
            background: '#060c10',
        }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                        <circle cx="16" cy="16" r="15" stroke="#a8e063" strokeWidth="1.5" opacity="0.6" />
                        <path d="M8 16 Q16 8 24 16 Q16 24 8 16Z" fill="#a8e063" opacity="0.4" />
                        <circle cx="16" cy="16" r="2" fill="#a8e063" />
                    </svg>
                    <div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px', color: '#f5f0e8' }}>CRIC-V</div>
                        <div style={{ fontSize: '11px', color: 'rgba(245,240,232,0.3)', fontFamily: 'DM Sans, sans-serif' }}>Cricket Vision</div>
                    </div>
                </div>

                {/* Center */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.25)', fontFamily: 'DM Sans, sans-serif' }}>
                        Final Year Project · Lahore Garrison University · BSIT 2026
                    </div>
                </div>

                {/* Links */}
                <div style={{ display: 'flex', gap: '2rem', justifyContent: 'flex-end' }}>
                    {[['Login', '/login'], ['Register', '/register'], ['Dashboard', '/dashboard']].map(([l, h]) => (
                        <Link key={l} href={h} style={{
                            fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
                            color: 'rgba(245,240,232,0.3)', textDecoration: 'none',
                            transition: 'color 0.2s',
                        }}
                            onMouseEnter={e => e.target.style.color = '#a8e063'}
                            onMouseLeave={e => e.target.style.color = 'rgba(245,240,232,0.3)'}
                        >{l}</Link>
                    ))}
                </div>
            </div>
        </footer>
    )
}