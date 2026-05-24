'use client'

import Navbar from '@/components/layout/Navbar'
import PageHeader from '@/components/layout/PageHeader'
import PlayerCard from '@/components/players/PlayerCard'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePlayers } from '@/lib/hooks/usePlayers'
import Link from 'next/link'
import { useState } from 'react'
import { Plus, Search, Users } from 'lucide-react'

export default function PlayersPage() {
    const { players, loading, error } = usePlayers()
    const [search, setSearch] = useState('')

    const filtered = players.filter((p) =>
        p.full_name?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar title="Players" />
            <div className="flex-1 p-6">
                <PageHeader
                    title="Players"
                    description="Manage your cricket players"
                    action={
                        <Link href="/players/new">
                            <Button className="bg-green-600 hover:bg-green-700 text-slate-900 dark:text-white">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Player
                            </Button>
                        </Link>
                    }
                />

                {/* Search */}
                <div className="relative mb-6 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-500 dark:text-slate-400" />
                    <Input
                        placeholder="Search players..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500"
                    />
                </div>

                {loading && (
                    <div className="flex justify-center py-20">
                        <LoadingSpinner text="Loading players..." />
                    </div>
                )}

                {error && (
                    <div className="text-center py-20">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {!loading && !error && filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Users className="h-16 w-16 text-slate-700 mb-4" />
                        <h3 className="text-slate-900 dark:text-white font-semibold text-lg mb-2">
                            {search ? 'No players found' : 'No players yet'}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm mb-4">
                            {search
                                ? 'Try a different search term'
                                : 'Add your first player to get started'}
                        </p>
                        {!search && (
                            <Link href="/players/new">
                                <Button className="bg-green-600 hover:bg-green-700 text-slate-900 dark:text-white">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Player
                                </Button>
                            </Link>
                        )}
                    </div>
                )}

                {!loading && !error && filtered.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filtered.map((player) => (
                            <PlayerCard key={player.id} player={player} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}