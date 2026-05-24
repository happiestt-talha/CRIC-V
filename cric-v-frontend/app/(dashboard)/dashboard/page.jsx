'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
import StatsCard from '@/components/dashboard/StatsCard'
import RecentSessions from '@/components/dashboard/RecentSessions'
import QuickActions from '@/components/dashboard/QuickActions'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { adminApi } from '@/lib/api/admin'
import { useAuth } from '@/lib/hooks/useAuth'
import {
    Video,
    Users,
    BarChart3,
    Zap,
    Activity,
} from 'lucide-react'
import { formatSpeed } from '@/lib/utils/formatters'

export default function DashboardPage() {
    const { user } = useAuth()
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        adminApi
            .getDashboardStats()
            .then(setStats)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen">
                <Navbar title="Dashboard" />
                <div className="flex-1 flex items-center justify-center">
                    <LoadingSpinner text="Loading dashboard..." />
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar title="Dashboard" />
            <div className="flex-1 p-6">
                {/* Welcome */}
                <div className="mb-6">
                    <h2 className="text-slate-900 dark:text-white text-xl font-semibold">
                        Welcome back, {user?.username} 👋
                    </h2>
                    <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Here&apos;s what&apos;s happening with your players today.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                    <StatsCard
                        title="Total Sessions"
                        value={stats?.total_sessions ?? 0}
                        subtitle={`${stats?.sessions_this_week ?? 0} this week`}
                        icon={Video}
                        iconColor="text-green-400"
                        iconBg="bg-green-600/20"
                    />
                    <StatsCard
                        title="Total Players"
                        value={stats?.total_players ?? 0}
                        icon={Users}
                        iconColor="text-blue-400"
                        iconBg="bg-blue-600/20"
                    />
                    <StatsCard
                        title="Analyses Done"
                        value={stats?.total_analyses ?? 0}
                        icon={BarChart3}
                        iconColor="text-purple-400"
                        iconBg="bg-purple-600/20"
                    />
                    <StatsCard
                        title="Avg Ball Speed"
                        value={
                            stats?.avg_ball_speed_kph
                                ? formatSpeed(stats.avg_ball_speed_kph)
                                : '—'
                        }
                        subtitle="Across all sessions"
                        icon={Zap}
                        iconColor="text-amber-400"
                        iconBg="bg-amber-600/20"
                    />
                </div>

                {/* Main content */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2">
                        <RecentSessions sessions={stats?.recent_sessions ?? []} />
                    </div>
                    <div>
                        <QuickActions />
                    </div>
                </div>
            </div>
        </div>
    )
}