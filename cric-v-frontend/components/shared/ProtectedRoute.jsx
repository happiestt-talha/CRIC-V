'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute({ children, requireAdmin = false }) {
    const { user, loading, isAdmin } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login')
        }
        if (!loading && requireAdmin && !isAdmin) {
            router.push('/dashboard')
        }
    }, [user, loading, requireAdmin, isAdmin, router])

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-200 dark:bg-slate-950 flex items-center justify-center">
                <LoadingSpinner text="Loading CRIC-V..." />
            </div>
        )
    }

    if (!user) return null
    if (requireAdmin && !isAdmin) return null

    return children
}