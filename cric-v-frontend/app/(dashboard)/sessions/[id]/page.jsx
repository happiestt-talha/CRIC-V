'use client'

import { use, useState, useEffect, useCallback } from 'react'
import Navbar from '@/components/layout/Navbar'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import BowlingAnalysis from '@/components/analysis/BowlingAnalysis'
import BattingAnalysis from '@/components/analysis/BattingAnalysis'
import PitchHeatmap from '@/components/analysis/PitchHeatmap'
import FeedbackForm from '@/components/analysis/FeedbackForm'
import VideoPlayer from '@/components/sessions/VideoPlayer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSession } from '@/lib/hooks/useSessions'
import { analysisApi } from '@/lib/api/analysis'
import { sessionsApi, getAnnotatedVideoUrl } from '@/lib/api/sessions'
import { formatDate, getStatusBadgeVariant } from '@/lib/utils/formatters'
import { API_BASE_URL } from '@/lib/utils/constants'
import {
    RefreshCw, Video, Play, ChevronLeft, Calendar,
    User, Activity, Shield, FileText, PlusCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DeleteSessionDialog from '@/components/sessions/DeleteSessionDialog'
import { useAuth } from '@/lib/hooks/useAuth'

export default function SessionDetailPage({ params }) {
    const { id } = use(params)
    const sessionId = parseInt(id)
    const router = useRouter()
    const { user } = useAuth()

    const { session, loading: sessionLoading, refresh: refreshSession } = useSession(sessionId)
    const [analysis, setAnalysis] = useState(null)
    const [deliveries, setDeliveries] = useState([])
    const [insights, setInsights] = useState(null)
    const [feedback, setFeedback] = useState([])
    const [loading, setLoading] = useState(true)
    const [reanalyzing, setReanalyzing] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [seekToSeconds, setSeekToSeconds] = useState(0)
    const [selectedDeliveryId, setSelectedDeliveryId] = useState(null)
    const [activeVideoTab, setActiveVideoTab] = useState('original')

    const isCoachOrAdmin = user?.role === 'coach' || user?.role === 'admin'
    const playerId = session?.player_id

    const fetchAnalysisData = useCallback(async () => {
        try {
            const [analysisData, deliveriesData] = await Promise.all([
                analysisApi.getSessionAnalysis(sessionId).catch(() => null),
                analysisApi.getSessionDeliveries(sessionId).catch(() => []),
            ])
            setAnalysis(analysisData)
            setDeliveries(deliveriesData)
            if (playerId) {
                const insightsData = await analysisApi.getBowlingInsights(playerId).catch(() => null)
                setInsights(insightsData)
            }
        } catch (error) {
            console.error('Error fetching analysis:', error)
        }
    }, [sessionId, playerId])

    useEffect(() => {
        if (!sessionId) return
        setLoading(true)
        Promise.all([
            fetchAnalysisData(),
            analysisApi.getSessionFeedback(sessionId).catch(() => []),
        ]).then(([_, feedbackData]) => {
            setFeedback(feedbackData)
            setLoading(false)
        })
    }, [sessionId, fetchAnalysisData])

    // Polling while session is processing
    useEffect(() => {
        let interval
        let isPolling = false
        const pendingStatuses = ['processing', 'analyzing', 'uploaded']
        if (sessionId && pendingStatuses.includes(session?.status)) {
            interval = setInterval(async () => {
                if (isPolling) return
                isPolling = true
                try {
                    const updatedSession = await sessionsApi.getSession(sessionId)
                    const done = updatedSession.status === 'completed' || updatedSession.status === 'failed'
                    const hasAnnotated = updatedSession.status === 'uploaded' && updatedSession.annotated_video_path
                    if (done || hasAnnotated) {
                        refreshSession()
                        fetchAnalysisData()
                        clearInterval(interval)
                    }
                } catch (e) {
                    if (e.response?.status === 404) {
                        clearInterval(interval)
                        return
                    }
                    if (e.message !== 'Network Error') console.error('Polling error:', e)
                } finally {
                    isPolling = false
                }
            }, 3000)
        }
        return () => clearInterval(interval)
    }, [session?.status, sessionId, refreshSession, fetchAnalysisData])

    const handleReanalyze = async () => {
        setReanalyzing(true)
        try {
            await analysisApi.triggerSessionAllAnalysis(sessionId)
            toast.success('Analysis started!', { description: 'Processing your video. This may take a minute...' })

            let isPolling = false
            const pollInterval = setInterval(async () => {
                if (!sessionId || isPolling) return
                isPolling = true
                try {
                    const updated = await sessionsApi.getSession(sessionId)
                    if (refreshSession) refreshSession()
                    if (updated.status === 'completed' || updated.status === 'failed') {
                        clearInterval(pollInterval)
                        setReanalyzing(false)
                        await fetchAnalysisData()
                        if (updated.status === 'completed') {
                            toast.success('Analysis complete!', { description: 'Annotated video and metrics are ready.' })
                        } else {
                            toast.error('Analysis failed. Please try again.')
                        }
                    }
                } catch (e) {
                    if (e.response?.status === 404) {
                        clearInterval(pollInterval)
                        setReanalyzing(false)
                        return
                    }
                    if (e.message !== 'Network Error') console.error('Polling error in handleReanalyze:', e)
                } finally {
                    isPolling = false
                }
            }, 3000)

            setTimeout(() => {
                clearInterval(pollInterval)
                setReanalyzing(false)
            }, 300000)
        } catch {
            toast.error('Failed to start analysis')
            setReanalyzing(false)
        }
    }

    const handleDeliveryView = (delivery) => {
        setSelectedDeliveryId(delivery.id)
        setActiveVideoTab('annotated')
        setTimeout(() => setSeekToSeconds(delivery.release_timestamp_seconds), 100)
    }

    if (sessionLoading || (loading && !session)) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-100 dark:bg-[#0f172a]">
                <Navbar title="Session" />
                <div className="flex-1 flex items-center justify-center">
                    <LoadingSpinner text="Loading session details..." />
                </div>
            </div>
        )
    }

    const firstVideo = session?.videos?.[0]
    const originalUrl = firstVideo
        ? `${API_BASE_URL}/sessions/${sessionId}/videos/${firstVideo.id}/stream`
        : null
    const annotatedUrl = getAnnotatedVideoUrl(sessionId)

    // Determine which analysis tabs to show
    const showBowling = session.session_type === 'bowling' || session.session_type === 'both'
    const showBatting = session.session_type === 'batting' || session.session_type === 'both'
    const defaultAnalysisTab = showBatting && !showBowling ? 'batting' : 'bowling'

    const metaItems = [
        { icon: <Activity className="w-3.5 h-3.5 text-blue-400" />, label: 'Session ID', value: `#${session.id}` },
        { icon: <User className="w-3.5 h-3.5 text-purple-400" />, label: 'Player', value: session.player?.full_name || `#${session.player_id}` },
        { icon: <Shield className="w-3.5 h-3.5 text-green-400" />, label: 'Discipline', value: session.session_type, capitalize: true },
        { icon: <Calendar className="w-3.5 h-3.5 text-amber-400" />, label: 'Recorded', value: formatDate(session.created_at) },
    ]

    return (
        <div className="flex flex-col min-h-screen bg-slate-100 dark:bg-[#0f172a] text-slate-800 dark:text-slate-200">
            <Navbar title="Session Analysis" />

            <div className="flex-1 w-full max-w-screen-2xl mx-auto px-4 md:px-6 py-6 space-y-6">

                {/* ── Page Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* Left: breadcrumb + title */}
                    <div className="space-y-1.5 min-w-0">
                        <Link
                            href="/sessions"
                            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-green-500 transition-colors group"
                        >
                            <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                            Back to Sessions
                        </Link>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none truncate">
                            {session.title || `Session #${session.id}`}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDate(session.created_at)}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600" />
                            <span className="flex items-center gap-1 capitalize">
                                <Shield className="w-3.5 h-3.5" />
                                {session.session_type}
                            </span>
                        </div>
                    </div>

                    {/* Right: status + actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Badge
                            variant={getStatusBadgeVariant(session.status)}
                            className="px-3 py-1 text-[10px] font-black uppercase tracking-widest border"
                        >
                            {session.status}
                        </Badge>

                        {isCoachOrAdmin && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-red-500/40 text-red-500 hover:bg-red-500/10 font-bold text-xs"
                                onClick={() => setDeleteDialogOpen(true)}
                            >
                                Delete
                            </Button>
                        )}

                        <Button
                            size="sm"
                            variant="outline"
                            className="border-green-500/40 text-green-500 hover:bg-green-600 hover:text-white font-bold text-xs gap-1.5 transition-all"
                            onClick={handleReanalyze}
                            disabled={reanalyzing || !analysis}
                        >
                            <RefreshCw className={cn('w-3.5 h-3.5', reanalyzing && 'animate-spin')} />
                            {reanalyzing ? 'Analyzing…' : 'Re-run AI'}
                        </Button>
                    </div>
                </div>

                {/* ── Main Two-Column Grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

                    {/* ══ LEFT COLUMN (2/5) ══ */}
                    <div className="lg:col-span-2 flex flex-col gap-5">

                        {/* Video Player Card */}
                        <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <CardHeader className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                    <Video className="w-3.5 h-3.5 text-green-500" />
                                    Video Feed
                                </CardTitle>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Live</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 space-y-3">
                                <Tabs value={activeVideoTab} onValueChange={setActiveVideoTab} className="w-full">
                                    <TabsList className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-0.5 h-8">
                                        <TabsTrigger
                                            value="original"
                                            className="flex-1 text-[10px] font-black uppercase tracking-wider h-full data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded"
                                        >
                                            Original
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="annotated"
                                            className="flex-1 text-[10px] font-black uppercase tracking-wider h-full data-[state=active]:bg-green-600 data-[state=active]:text-white rounded"
                                        >
                                            Annotated
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>

                                {/* Video content */}
                                {activeVideoTab === 'original' && (
                                    <VideoPlayer src={originalUrl} label="Original Recording" />
                                )}

                                {activeVideoTab === 'annotated' && (
                                    session.annotated_video_path || analysis ? (
                                        <VideoPlayer
                                            src={annotatedUrl}
                                            seekToSeconds={seekToSeconds}
                                            label="AI Annotated Result"
                                        />
                                    ) : (
                                        <div className="aspect-video bg-slate-50 dark:bg-slate-950/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center gap-3 p-6 text-center">
                                            <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                                <Video className="w-5 h-5 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Not Ready</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">Run analysis to generate AI overlays</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs mt-1"
                                                onClick={handleReanalyze}
                                                disabled={reanalyzing}
                                            >
                                                {reanalyzing ? 'Processing…' : 'Analyze Now'}
                                            </Button>
                                        </div>
                                    )
                                )}
                            </CardContent>
                        </Card>

                        {/* Session Metadata Card */}
                        <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <CardHeader className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5 text-green-500" />
                                    Session Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {metaItems.map((item, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                                {item.icon}
                                                <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                                            </div>
                                            <span className={cn('text-xs font-semibold text-slate-700 dark:text-slate-300', item.capitalize && 'capitalize')}>
                                                {item.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {session.description && (
                                    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Coaching Notes</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 italic leading-relaxed">"{session.description}"</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Media Assets Card */}
                        <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            <CardHeader className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                    <Video className="w-3.5 h-3.5 text-green-500" />
                                    Media Assets
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[10px] font-bold text-green-500 hover:text-green-400 hover:bg-green-500/10 px-2 gap-1"
                                    onClick={() => router.push(`/sessions/${sessionId}/upload`)}
                                >
                                    <PlusCircle className="w-3 h-3" />
                                    Add
                                </Button>
                            </CardHeader>
                            <CardContent className="p-3">
                                {session.videos && session.videos.length > 0 ? (
                                    <div className="space-y-2">
                                        {session.videos.map((vid) => (
                                            <div
                                                key={vid.id}
                                                className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-all group"
                                            >
                                                <div className="w-9 h-9 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-green-500 transition-colors shrink-0">
                                                    <Play className="w-3.5 h-3.5 fill-current" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{vid.original_filename}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <Badge
                                                            className={cn(
                                                                'text-[8px] h-3.5 px-1.5 font-bold border-none',
                                                                vid.status === 'done'
                                                                    ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                                                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                                            )}
                                                        >
                                                            {vid.status}
                                                        </Badge>
                                                        <span className="text-[9px] font-medium text-slate-400">{vid.file_size_mb} MB</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950/30">
                                        <Video className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">No Media</p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs font-semibold"
                                            onClick={() => router.push(`/sessions/${sessionId}/upload`)}
                                        >
                                            Upload Now
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* ══ RIGHT COLUMN (3/5) ══ */}
                    <div className="lg:col-span-3">
                        {!analysis ? (
                            /* No analysis state */
                            <Card className="min-h-[560px] bg-white dark:bg-slate-900/60 border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center p-10 text-center">
                                <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-6 relative">
                                    <Activity className="w-9 h-9 text-slate-300 dark:text-slate-600" />
                                    <RefreshCw className="w-5 h-5 absolute -bottom-1 -right-1 text-green-500/50 animate-spin" style={{ animationDuration: '3s' }} />
                                </div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
                                    No Analysis Yet
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-8 leading-relaxed">
                                    Our AI engine hasn&apos;t processed this session. Start the analysis to unlock detailed performance insights.
                                </p>
                                <Button
                                    size="lg"
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-10 shadow-lg shadow-green-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] h-11"
                                    onClick={handleReanalyze}
                                    disabled={reanalyzing}
                                >
                                    {reanalyzing ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                            Analyzing…
                                        </>
                                    ) : (
                                        'Start AI Analysis'
                                    )}
                                </Button>
                            </Card>
                        ) : (
                            /* Analysis tabs */
                            <Tabs defaultValue={defaultAnalysisTab} className="w-full flex flex-col">
                                {/* Tab bar */}
                                <div className="mb-4">
                                    <TabsList className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-1 flex gap-0.5 w-auto shadow-sm">
                                        {showBowling && (
                                            <TabsTrigger
                                                value="bowling"
                                                className="text-[10px] font-black uppercase tracking-wider px-4 h-7 data-[state=active]:bg-green-600 data-[state=active]:text-white rounded"
                                            >
                                                Bowling
                                            </TabsTrigger>
                                        )}
                                        {showBatting && (
                                            <TabsTrigger
                                                value="batting"
                                                className="text-[10px] font-black uppercase tracking-wider px-4 h-7 data-[state=active]:bg-green-600 data-[state=active]:text-white rounded"
                                            >
                                                Batting
                                            </TabsTrigger>
                                        )}
                                        <TabsTrigger
                                            value="heatmap"
                                            className="text-[10px] font-black uppercase tracking-wider px-4 h-7 data-[state=active]:bg-green-600 data-[state=active]:text-white rounded"
                                        >
                                            Heatmap
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="feedback"
                                            className="text-[10px] font-black uppercase tracking-wider px-4 h-7 data-[state=active]:bg-green-600 data-[state=active]:text-white rounded flex items-center gap-1.5"
                                        >
                                            Feedback
                                            {feedback.length > 0 && (
                                                <span className="w-4 h-4 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 text-[8px] font-black flex items-center justify-center">
                                                    {feedback.length}
                                                </span>
                                            )}
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                {/* Tab content */}
                                <div className="min-h-[560px]">
                                    {showBowling && (
                                        <TabsContent value="bowling" className="mt-0 focus-visible:ring-0">
                                            <BowlingAnalysis
                                                analysis={analysis}
                                                deliveries={deliveries}
                                                onDeliveryClick={handleDeliveryView}
                                                selectedDeliveryId={selectedDeliveryId}
                                                sessionId={sessionId}
                                            />
                                        </TabsContent>
                                    )}

                                    {showBatting && (
                                        <TabsContent value="batting" className="mt-0 focus-visible:ring-0">
                                            <BattingAnalysis analysis={analysis} />
                                        </TabsContent>
                                    )}

                                    <TabsContent value="heatmap" className="mt-0 focus-visible:ring-0">
                                        <PitchHeatmap insights={insights} />
                                    </TabsContent>

                                    <TabsContent value="feedback" className="mt-0 focus-visible:ring-0">
                                        <FeedbackForm
                                            sessionId={sessionId}
                                            existingFeedback={feedback}
                                            onSuccess={() => analysisApi.getSessionFeedback(sessionId).then(setFeedback)}
                                        />
                                    </TabsContent>
                                </div>
                            </Tabs>
                        )}
                    </div>

                </div>
            </div>

            <DeleteSessionDialog
                sessionId={sessionId}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onSuccess={() => router.push('/sessions')}
            />
        </div>
    )
}