'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import Navbar from '@/components/layout/Navbar'
import PageHeader from '@/components/layout/PageHeader'
import SessionStepper from '@/components/sessions/SessionStepper'
import VideoUpload from '@/components/sessions/VideoUpload'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import UrlImport from '@/components/sessions/UrlImport'
import { sessionsApi } from '@/lib/api/sessions'
import { analysisApi } from '@/lib/api/analysis'
import { toast } from 'sonner'
import { Trash2, Play, CheckCircle2, Clock, Loader2, Video as VideoIcon, Link } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

import DeleteSessionDialog from '@/components/sessions/DeleteSessionDialog'
import { useAuth } from '@/lib/hooks/useAuth'

export default function SessionUploadPage() {
    const router = useRouter()
    const { id } = useParams()
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [session, setSession] = useState(null)
    const [videos, setVideos] = useState([])
    const [refreshing, setRefreshing] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    const isCoachOrAdmin = user?.role === 'coach' || user?.role === 'admin'

    const fetchData = useCallback(async () => {
        try {
            const [sessionData, videosData] = await Promise.all([
                sessionsApi.getSession(id),
                sessionsApi.getVideos(id)
            ])
            setSession(sessionData)
            setVideos(videosData)
        } catch (err) {
            toast.error('Failed to load session data')
            console.error(err)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [id])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleUpload = async (file, onProgress) => {
        return await sessionsApi.uploadVideo(id, file, onProgress)
    }

    const handleDelete = async (videoId) => {
        try {
            await sessionsApi.deleteVideo(id, videoId)
            toast.success('Video deleted')
            fetchData()
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete video')
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-100 dark:bg-[#0f172a]">
                <Navbar title="Upload Videos" />
                <div className="p-6 space-y-6">
                    <Skeleton className="h-10 w-1/3 bg-slate-100 dark:bg-slate-800" />
                    <Skeleton className="h-32 w-full bg-slate-100 dark:bg-slate-800" />
                    <Skeleton className="h-64 w-full bg-slate-100 dark:bg-slate-800" />
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-100 dark:bg-[#0f172a] text-slate-700 dark:text-slate-200">
            <Navbar title="Upload Videos" />
            <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
                <PageHeader
                    title={`Session: ${session?.title || 'Untitled'}`}
                    description="Step 2: Upload Training Videos"
                    backHref="/sessions"
                    action={
                        isCoachOrAdmin && (
                            <Button
                                variant="outline"
                                className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                                onClick={() => setDeleteDialogOpen(true)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Abandon Session
                            </Button>
                        )
                    }
                />

                <DeleteSessionDialog 
                    sessionId={id}
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    onSuccess={() => router.push('/sessions')}
                />

                <SessionStepper currentStep={1} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Upload Zone */}
                    <div className="lg:col-span-1">
                        <Card className="bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-sm font-semibold">Import Training Video</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="upload" className="w-full">
                                    <TabsList className="bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 mb-6 w-full p-1 h-auto">
                                        <TabsTrigger value="upload" className="flex-1 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 text-slate-500 dark:text-slate-400 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white font-black text-[10px] uppercase tracking-wider gap-2 transition-all">
                                            <VideoIcon className="h-3.5 w-3.5" />
                                            Upload File
                                        </TabsTrigger>
                                        <TabsTrigger value="url" className="flex-1 py-2 data-[state=active]:bg-green-600 data-[state=active]:text-white text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-wider gap-2 transition-all">
                                            <Link className="h-3.5 w-3.5" />
                                            From URL
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="upload">
                                        <VideoUpload 
                                            onUpload={handleUpload} 
                                            onUploadComplete={fetchData}
                                        />
                                    </TabsContent>

                                    <TabsContent value="url">
                                        <UrlImport sessionId={id} onSuccess={fetchData} />
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Uploaded Videos List */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Uploaded Videos ({videos.length})</h3>
                            {refreshing && <Loader2 className="h-4 w-4 animate-spin text-green-500" />}
                        </div>

                        {videos.length === 0 ? (
                            <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 border-dashed p-12 text-center">
                                <VideoIcon className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                                <p className="text-slate-500 dark:text-slate-500">No videos uploaded yet for this session.</p>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {videos.map((video) => (
                                    <Card key={video.id} className="bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                                        <CardContent className="p-4 flex items-center gap-4">
                                            <div className="h-12 w-12 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                                <VideoIcon className="h-6 w-6 text-slate-500 dark:text-slate-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-slate-900 dark:text-white font-medium truncate text-sm">
                                                    {video.original_filename}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs text-slate-500 dark:text-slate-500">{video.file_size_mb} MB</span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(video.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge className={cn(
                                                    "text-[10px] uppercase font-bold",
                                                    video.status === 'done' ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30" :
                                                    video.status === 'analyzing' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30" :
                                                    "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                                                )}>
                                                    {video.status}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-500 dark:text-slate-500 hover:text-red-400"
                                                    onClick={() => handleDelete(video.id)}
                                                    disabled={video.status === 'analyzing'}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                    onClick={() => router.push(`/sessions/${id}/analyze?video=${video.id}`)}
                                                >
                                                    <Play className="h-3 w-3 mr-1" /> Analyze
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {videos.length > 0 && (
                            <div className="pt-4 flex justify-end">
                                <Button
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => router.push(`/sessions/${id}/analyze`)}
                                >
                                    Proceed to Analysis
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
