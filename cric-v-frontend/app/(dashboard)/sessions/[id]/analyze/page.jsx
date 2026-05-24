'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import PageHeader from '@/components/layout/PageHeader'
import SessionStepper from '@/components/sessions/SessionStepper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { sessionsApi } from '@/lib/api/sessions'
import { analysisApi } from '@/lib/api/analysis'
import { toast } from 'sonner'
import { 
    Play, 
    CheckCircle2, 
    Circle, 
    XCircle, 
    Loader2, 
    ArrowRight,
    PlayCircle,
    Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export default function SessionAnalyzePage() {
    const router = useRouter()
    const { id } = useParams()
    const searchParams = useSearchParams()
    const initialVideoId = searchParams.get('video')

    const [loading, setLoading] = useState(true)
    const [session, setSession] = useState(null)
    const [videos, setVideos] = useState([])
    const [activeAnalysis, setActiveAnalysis] = useState(null) // { taskId, videoId, status, progress }
    const [progressData, setProgressData] = useState(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const esRef = useRef(null)

    const fetchData = useCallback(async () => {
        try {
            const [sessionData, videosData] = await Promise.all([
                sessionsApi.getSession(id),
                sessionsApi.getVideos(id)
            ])
            setSession(sessionData)
            setVideos(videosData)
            
            // If direct link to analyze a video
            if (initialVideoId && !isProcessing) {
                // handleTriggerVideo(parseInt(initialVideoId))
            }
        } catch (err) {
            toast.error('Failed to load session data')
        } finally {
            setLoading(false)
        }
    }, [id, initialVideoId, isProcessing])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // SSE Setup
    const connectSSE = useCallback((taskId) => {
        if (esRef.current) esRef.current.close()

        const es = new EventSource(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/analysis/progress/${taskId}`, {
            withCredentials: true
        })

        es.onmessage = (event) => {
            const data = JSON.parse(event.data)
            setProgressData(data)
            
            if (data.status === 'complete' || data.status === 'failed') {
                es.close()
                setIsProcessing(false)
                if (data.status === 'complete') {
                    toast.success('Analysis completed!')
                    fetchData()
                } else {
                    toast.error(`Analysis failed: ${data.stage}`)
                }
            }
        }

        es.onerror = () => {
            es.close()
            setIsProcessing(false)
            toast.error('Lost connection to analysis server')
        }

        esRef.current = es
    }, [fetchData])

    useEffect(() => {
        return () => {
            if (esRef.current) esRef.current.close()
        }
    }, [])

    // BeforeUnload Warning
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isProcessing) {
                e.preventDefault()
                e.returnValue = 'Analysis is in progress. Are you sure you want to leave?'
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isProcessing])

    const handleTriggerVideo = async (videoId) => {
        setIsProcessing(true)
        setProgressData({ percent: 0, stage: 'Connecting...', status: 'processing', video_id: videoId })
        try {
            const result = await analysisApi.triggerVideoAnalysis(videoId)
            connectSSE(result.task_id)
        } catch (err) {
            setIsProcessing(false)
            toast.error('Failed to start analysis')
        }
    }

    const handleTriggerAll = async () => {
        setIsProcessing(true)
        setProgressData({ percent: 0, stage: 'Connecting...', status: 'processing', video_id: null })
        try {
            const result = await analysisApi.triggerSessionAllAnalysis(id)
            connectSSE(result.task_id)
        } catch (err) {
            setIsProcessing(false)
            toast.error('Failed to start batch analysis')
        }
    }

    const stages = [
        "Extracting frames",
        "Running pose estimation",
        "Detecting ball & Computing metrics",
        "Saving results",
        "Complete"
    ]

    const getStageStatus = (stageName) => {
        if (!progressData) return 'pending'
        const currentIndex = stages.indexOf(progressData.stage)
        const targetIndex = stages.indexOf(stageName)

        if (progressData.status === 'complete') return 'complete'
        if (progressData.status === 'failed' && progressData.stage.includes(stageName)) return 'failed'
        if (currentIndex === targetIndex) return 'active'
        if (currentIndex > targetIndex) return 'complete'
        return 'pending'
    }

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-100 dark:bg-[#0f172a]">
                <Navbar title="Run Analysis" />
                <div className="p-6 space-y-6 max-w-4xl mx-auto w-full">
                    <Skeleton className="h-10 w-1/2 bg-slate-100 dark:bg-slate-800" />
                    <Skeleton className="h-40 w-full bg-slate-100 dark:bg-slate-800" />
                    <Skeleton className="h-64 w-full bg-slate-100 dark:bg-slate-800" />
                </div>
            </div>
        )
    }

    const activeVideo = progressData?.video_id ? videos.find(v => v.id === progressData.video_id) : null

    return (
        <div className="flex flex-col min-h-screen bg-slate-100 dark:bg-[#0f172a] text-slate-700 dark:text-slate-200">
            <Navbar title="Run Analysis" />
            <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
                <PageHeader
                    title="Analysis Workflow"
                    description="Step 3: Process Videos & Generate Insights"
                    backHref={`/sessions/${id}/upload`}
                />

                <SessionStepper currentStep={2} />

                <div className="space-y-8">
                    {/* Header Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <PlayCircle className="h-5 w-5 text-green-500" />
                                Ready to Analyze
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                {videos.length} videos available for processing in this session.
                            </p>
                        </div>
                        <Button 
                            onClick={handleTriggerAll} 
                            disabled={isProcessing || videos.length === 0}
                            className="bg-green-600 hover:bg-green-700 text-white px-8"
                        >
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '🚀 Analyze All Videos'}
                        </Button>
                    </div>

                    {/* Progress Panel */}
                    {isProcessing && (
                        <Card className="bg-white dark:bg-[#1e293b] border-green-500/30 shadow-lg shadow-green-500/5 animate-in fade-in slide-in-from-top-4 duration-500">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-slate-900 dark:text-white text-lg flex items-center gap-2">
                                        {activeVideo ? `Analyzing: ${activeVideo.original_filename}` : 'Batch Processing Session'}
                                    </CardTitle>
                                    <Badge variant="outline" className="text-green-400 border-green-500/30">
                                        {progressData?.percent}%
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Progress value={progressData?.percent} className="h-2 bg-slate-100 dark:bg-slate-800 transition-all duration-500" />
                                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">Current Stage: {progressData?.stage}</p>
                                </div>

                                <div className="space-y-4">
                                    {stages.map((stage, i) => {
                                        const status = getStageStatus(stage)
                                        return (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="shrink-0">
                                                    {status === 'complete' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                                                    {status === 'active' && <Loader2 className="h-5 w-5 text-green-500 animate-spin" />}
                                                    {status === 'pending' && <Circle className="h-5 w-5 text-slate-700" />}
                                                    {status === 'failed' && <XCircle className="h-5 w-5 text-red-500" />}
                                                </div>
                                                <span className={cn(
                                                    "text-sm font-medium",
                                                    status === 'active' ? "text-slate-900 dark:text-white" : 
                                                    status === 'complete' ? "text-slate-500 dark:text-slate-400" : "text-slate-400 dark:text-slate-600"
                                                )}>
                                                    {stage}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Result Banners */}
                    {progressData?.status === 'complete' && !isProcessing && (
                        <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3 text-green-400">
                                <CheckCircle2 className="h-5 w-5" />
                                <div>
                                    <p className="font-semibold">Analysis Successful!</p>
                                    <p className="text-xs opacity-80">All metrics and visualizations have been generated.</p>
                                </div>
                            </div>
                            <Button 
                                onClick={() => router.push(`/sessions/${id}`)}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs h-8"
                            >
                                View Detailed Results <ArrowRight className="ml-2 h-3 w-3" />
                            </Button>
                        </div>
                    )}

                    {progressData?.status === 'failed' && !isProcessing && (
                        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3 text-red-400">
                                <XCircle className="h-5 w-5" />
                                <div>
                                    <p className="font-semibold">Analysis Failed</p>
                                    <p className="text-xs opacity-80">{progressData.stage}</p>
                                </div>
                            </div>
                            <Button 
                                onClick={handleTriggerAll}
                                variant="outline"
                                className="border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs h-8"
                            >
                                Retry Analysis
                            </Button>
                        </div>
                    )}

                    {/* Video List */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Individual Videos</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {videos.map((video) => (
                                <Card key={video.id} className="bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                                <Play className="h-4 w-4 text-slate-500 dark:text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">{video.original_filename}</p>
                                                <Badge variant="outline" className="text-[10px] mt-1 h-4 px-1.5 text-slate-500 dark:text-slate-500 border-slate-300 dark:border-slate-700">
                                                    {video.status === 'done' ? 'Processed' : 'Unprocessed'}
                                                </Badge>
                                            </div>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="text-green-500 hover:bg-green-500/10 text-xs"
                                            disabled={isProcessing || video.status === 'analyzing'}
                                            onClick={() => handleTriggerVideo(video.id)}
                                        >
                                            {video.status === 'done' ? 'Re-analyze' : 'Analyze Now'}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 flex gap-3">
                        <Info className="h-5 w-5 text-blue-500 shrink-0" />
                        <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed">
                            AI analysis usually takes 1-3 minutes per video depending on duration and frame rate. 
                            You can navigate away after starting the process; analysis will continue in the background.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
