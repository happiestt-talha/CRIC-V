'use client'

import { use } from 'react'
import Navbar from '@/components/layout/Navbar'
import PageHeader from '@/components/layout/PageHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useBowlingInsights, useBattingInsights } from '@/lib/hooks/useAnalysis'
import { useSessions } from '@/lib/hooks/useSessions'
import { usePlayers } from '@/lib/hooks/usePlayers'
import { formatSpeed, formatDate, formatPercentage } from '@/lib/utils/formatters'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import SessionCard from '@/components/sessions/SessionCard'

const PIE_COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2']

export default function PlayerProfilePage({ params }) {
    const { id } = use(params)
    const playerId = parseInt(id)

    const { players } = usePlayers()
    const player = players.find((p) => p.id === playerId)

    const { insights: bowlingInsights, loading: bowlingLoading } = useBowlingInsights(playerId)
    const { insights: battingInsights, loading: battingLoading } = useBattingInsights(playerId)
    const { sessions, loading: sessionsLoading } = useSessions(playerId)

    const shotDistributionData = battingInsights?.shot_distribution
        ? Object.entries(battingInsights.shot_distribution).map(([name, data]) => ({
            name: name.replace(/_/g, ' '),
            value: data.count || 0,
            avg_quality: data.avg_quality || 0,
        }))
        : []

    const speedTrendData = bowlingInsights?.session_comparison
        ? bowlingInsights.session_comparison.map((s, i) => ({
            session: `S${i + 1}`,
            speed: s.avg_speed,
            accuracy: s.accuracy_score,
        }))
        : []

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar title="Player Profile" />
            <div className="flex-1 p-6">
                <PageHeader
                    title={player?.full_name || `Player #${playerId}`}
                    description="Performance insights and analysis history"
                    backHref="/players"
                    backLabel="Players"
                />

                {/* Player Info Card */}
                {player && (
                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 mb-6">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-5">
                                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-600/20 text-green-400 text-2xl font-bold">
                                    {player.full_name?.charAt(0)?.toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-slate-900 dark:text-white text-xl font-bold">{player.full_name}</h2>
                                    {player.age && <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm">Age: {player.age}</p>}
                                    <div className="flex gap-2 mt-2">
                                        {player.batting_hand && (
                                            <Badge variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-500 dark:text-slate-400 capitalize text-xs">
                                                {player.batting_hand} hand
                                            </Badge>
                                        )}
                                        {player.bowling_style && (
                                            <Badge variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-500 dark:text-slate-400 text-xs">
                                                {player.bowling_style?.replace(/_/g, ' ')}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div>
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{sessions.length}</p>
                                        <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-xs">Sessions</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-green-400">
                                            {bowlingInsights?.speed_consistency?.avg_speed
                                                ? `${Math.round(bowlingInsights.speed_consistency.avg_speed)}`
                                                : '—'}
                                        </p>
                                        <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-xs">Avg km/h</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Tabs */}
                <Tabs defaultValue="bowling">
                    <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-6">
                        <TabsTrigger value="bowling" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-slate-500 dark:text-slate-500 dark:text-slate-400">
                            Bowling
                        </TabsTrigger>
                        <TabsTrigger value="batting" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-slate-500 dark:text-slate-500 dark:text-slate-400">
                            Batting
                        </TabsTrigger>
                        <TabsTrigger value="sessions" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-slate-500 dark:text-slate-500 dark:text-slate-400">
                            Sessions
                        </TabsTrigger>
                    </TabsList>

                    {/* BOWLING TAB */}
                    <TabsContent value="bowling">
                        {bowlingLoading ? (
                            <div className="flex justify-center py-10"><LoadingSpinner /></div>
                        ) : !bowlingInsights ? (
                            <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-center py-10">No bowling data yet</p>
                        ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                {/* Speed stats */}
                                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="text-slate-900 dark:text-white text-sm">Speed Consistency</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-3 gap-4">
                                        {[
                                            { label: 'Avg Speed', value: formatSpeed(bowlingInsights.speed_consistency?.avg_speed) },
                                            { label: 'Max Speed', value: formatSpeed(bowlingInsights.speed_consistency?.max_speed) },
                                            { label: 'Consistency', value: formatPercentage(bowlingInsights.speed_consistency?.consistency_score) },
                                        ].map((stat) => (
                                            <div key={stat.label} className="text-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                                <p className="text-green-400 text-lg font-bold">{stat.value}</p>
                                                <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-xs mt-1">{stat.label}</p>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                {/* ICC compliance */}
                                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="text-slate-900 dark:text-white text-sm">ICC Compliance</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {bowlingInsights.icc_compliance ? (
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm">Compliant deliveries</span>
                                                    <span className="text-green-400 font-bold">
                                                        {formatPercentage(bowlingInsights.icc_compliance.compliant_percentage)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm">Avg elbow angle</span>
                                                    <span className="text-slate-900 dark:text-white font-bold">
                                                        {bowlingInsights.icc_compliance.avg_elbow_angle?.toFixed(1)}°
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm">Total violations</span>
                                                    <Badge variant={bowlingInsights.icc_compliance.total_violations > 0 ? 'destructive' : 'default'}>
                                                        {bowlingInsights.icc_compliance.total_violations}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm">No compliance data</p>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Speed trend chart */}
                                {speedTrendData.length > 0 && (
                                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 xl:col-span-2">
                                        <CardHeader>
                                            <CardTitle className="text-slate-900 dark:text-white text-sm">Speed Trend</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={200}>
                                                <LineChart data={speedTrendData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                    <XAxis dataKey="session" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                                    <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                                                        labelStyle={{ color: '#fff' }}
                                                    />
                                                    <Line type="monotone" dataKey="speed" stroke="#16a34a" strokeWidth={2} dot={{ fill: '#16a34a', r: 4 }} name="Speed (km/h)" />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </TabsContent>

                    {/* BATTING TAB */}
                    <TabsContent value="batting">
                        {battingLoading ? (
                            <div className="flex justify-center py-10"><LoadingSpinner /></div>
                        ) : !battingInsights ? (
                            <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-center py-10">No batting data yet</p>
                        ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                {/* Shot distribution */}
                                {shotDistributionData.length > 0 && (
                                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                        <CardHeader>
                                            <CardTitle className="text-slate-900 dark:text-white text-sm">Shot Distribution</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={220}>
                                                <PieChart>
                                                    <Pie
                                                        data={shotDistributionData}
                                                        cx="50%"
                                                        cy="50%"
                                                        outerRadius={80}
                                                        dataKey="value"
                                                        nameKey="name"
                                                    >
                                                        {shotDistributionData.map((_, index) => (
                                                            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Legend
                                                        formatter={(value) => (
                                                            <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>
                                                        )}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Technique scores */}
                                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="text-slate-900 dark:text-white text-sm">Technique Scores</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {battingInsights.technique_scores &&
                                            Object.entries(battingInsights.technique_scores).map(([key, value]) => (
                                                <div key={key}>
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-xs capitalize">
                                                            {key.replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="text-slate-900 dark:text-white text-xs font-medium">
                                                            {typeof value === 'number' ? `${Math.round(value)}/100` : value}
                                                        </span>
                                                    </div>
                                                    {typeof value === 'number' && (
                                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                                                            <div
                                                                className="h-1.5 rounded-full bg-green-500"
                                                                style={{ width: `${Math.min(value, 100)}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </TabsContent>

                    {/* SESSIONS TAB */}
                    <TabsContent value="sessions">
                        {sessionsLoading ? (
                            <div className="flex justify-center py-10"><LoadingSpinner /></div>
                        ) : sessions.length === 0 ? (
                            <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-center py-10">No sessions for this player</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                {sessions.map((session) => (
                                    <SessionCard key={session.id} session={session} />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}