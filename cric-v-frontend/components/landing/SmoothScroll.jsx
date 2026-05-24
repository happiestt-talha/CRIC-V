'use client'

import { useEffect, useRef } from 'react'

export default function SmoothScroll({ children }) {
    const cursorDot = useRef(null)
    const cursorRing = useRef(null)

    useEffect(() => {
        const dot = cursorDot.current
        const ring = cursorRing.current
        if (!dot || !ring) return

        let ringX = 0, ringY = 0
        let dotX = 0, dotY = 0
        let raf

        const move = (e) => {
            dotX = e.clientX
            dotY = e.clientY
        }
        window.addEventListener('mousemove', move)

        const animate = () => {
            ringX += (dotX - ringX) * 0.12
            ringY += (dotY - ringY) * 0.12
            dot.style.left = dotX + 'px'
            dot.style.top = dotY + 'px'
            ring.style.left = ringX + 'px'
            ring.style.top = ringY + 'px'
            raf = requestAnimationFrame(animate)
        }
        raf = requestAnimationFrame(animate)

        // Hover effect on interactive elements
        const els = document.querySelectorAll('a, button')
        const onEnter = () => {
            dot.style.width = '16px'
            dot.style.height = '16px'
            ring.style.width = '56px'
            ring.style.height = '56px'
        }
        const onLeave = () => {
            dot.style.width = '8px'
            dot.style.height = '8px'
            ring.style.width = '36px'
            ring.style.height = '36px'
        }
        els.forEach(el => { el.addEventListener('mouseenter', onEnter); el.addEventListener('mouseleave', onLeave) })

        return () => {
            window.removeEventListener('mousemove', move)
            cancelAnimationFrame(raf)
        }
    }, [])

    // Scroll reveal
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) e.target.classList.add('visible')
            })
        }, { threshold: 0.12 })

        const els = document.querySelectorAll('.fade-up')
        els.forEach(el => observer.observe(el))
        return () => observer.disconnect()
    }, [])

    return (
        <>
            <div className="cursor-dot" ref={cursorDot} />
            <div className="cursor-ring" ref={cursorRing} />
            {children}
        </>
    )
}