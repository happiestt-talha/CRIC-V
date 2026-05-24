'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import PageHeader from '@/components/layout/PageHeader'
import SessionCard from '@/components/sessions/SessionCard'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useSessions } from '@/lib/hooks/useSessions'
import { Plus, Search, Video } from 'lucide-react'

export default function SessionsPage() {
    const { sessions, loading, error, setSessions } = useSessions()
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')

    const filtered = sessions.filter((s) => {
        const matchSearch =
            s.title?.toLowerCase().includes(search.toLowerCase()) ||
            String(s.id).includes(search)
        const matchType =
            typeFilter === 'all' || s.session_type === typeFilter
        const matchStatus =
            statusFilter === 'all' || s.status === statusFilter
        return matchSearch && matchType && matchStatus
    })

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar title="Sessions" />
            <div className="flex-1 p-6">
                <PageHeader
                    title="Training Sessions"
                    description="All cricket training sessions"
                    action={
                        <Link href="/sessions/new">
                            <Button className="bg-green-600 hover:bg-green-700 text-slate-900 dark:text-white">
                                <Plus className="h-4 w-4 mr-2" />
                                New Session
                            </Button>
                        </Link>
                    }
                />

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-500 dark:text-slate-400" />
                        <Input
                            placeholder="Search sessions..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500"
                        />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-40 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                            <SelectItem value="all" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800">All Types</SelectItem>
                            <SelectItem value="bowling" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800">Bowling</SelectItem>
                            <SelectItem value="batting" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800">Batting</SelectItem>
                            <SelectItem value="both" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800">Both</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-40 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                            <SelectItem value="all" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800">All Status</SelectItem>
                            <SelectItem value="pending" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800">Pending</SelectItem>
                            <SelectItem value="processing" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800">Processing</SelectItem>
                            <SelectItem value="completed" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800">Completed</SelectItem>
                            <SelectItem value="failed" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-slate-800">Failed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {loading && (
                    <div className="flex justify-center py-20">
                        <LoadingSpinner text="Loading sessions..." />
                    </div>
                )}

                {error && (
                    <div className="text-center py-20">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {!loading && !error && filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Video className="h-16 w-16 text-slate-700 mb-4" />
                        <h3 className="text-slate-900 dark:text-white font-semibold text-lg mb-2">
                            {search || typeFilter !== 'all' || statusFilter !== 'all'
                                ? 'No sessions match your filters'
                                : 'No sessions yet'}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm mb-4">
                            Create your first training session to get started
                        </p>
                        <Link href="/sessions/new">
                            <Button className="bg-green-600 hover:bg-green-700 text-slate-900 dark:text-white">
                                <Plus className="h-4 w-4 mr-2" />
                                New Session
                            </Button>
                        </Link>
                    </div>
                )}

                {!loading && !error && filtered.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filtered.map((session) => (
                            <SessionCard 
                                key={session.id} 
                                session={session} 
                                onDeleteSuccess={(id) => {
                                    const updated = sessions.filter(s => s.id !== id)
                                    // Note: we need to use setSessions from useSessions
                                    // Since useSessions returns it, we can access it if we destructure it
                                    setSessions(updated)
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}