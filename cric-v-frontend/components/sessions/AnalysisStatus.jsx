'use client'

import { useEffect, useState } from 'react'
import { ballTrackingApi } from '@/lib/api/ballTracking'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react'

export default function AnalysisStatus({ taskId, onComplete }) {
    const [status, setStatus] = useState('pending')
    const [progress, setProgress] = useState(10)

    useEffect(() => {
        if (!taskId) return

        const poll = setInterval(async () => {
            try {
                const data = await ballTrackingApi.getTaskStatus(taskId)
                const taskStatus = data?.status || data?.state || 'pending'

                setStatus(taskStatus.toLowerCase())

                if (taskStatus.toLowerCase() === 'success' ||
                    taskStatus.toLowerCase() === 'completed') {
                    setProgress(100)
                    clearInterval(poll)
                    if (onComplete) onComplete(data)
                } else if (taskStatus.toLowerCase() === 'failure' ||
                    taskStatus.toLowerCase() === 'failed') {
                    clearInterval(poll)
                } else {
                    setProgress((prev) => Math.min(prev + 10, 90))
                }
            } catch {
                clearInterval(poll)
                setStatus('failed')
            }
        }, 2000)

        return () => clearInterval(poll)
    }, [taskId, onComplete])

    const getIcon = () => {
        switch (status) {
            case 'success':
            case 'completed':
                return <CheckCircle2 className="h-5 w-5 text-green-400" />
            case 'failure':
            case 'failed':
                return <XCircle className="h-5 w-5 text-red-400" />
            default:
                return <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
        }
    }

    const getLabel = () => {
        switch (status) {
            case 'success':
            case 'completed':
                return 'Analysis Complete'
            case 'failure':
            case 'failed':
                return 'Analysis Failed'
            case 'processing':
                return 'Processing Video...'
            default:
                return 'Queued...'
        }
    }

    return (
        <div className="space-y-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700">
            <div className="flex items-center gap-3">
                {getIcon()}
                <span className="text-slate-900 dark:text-white text-sm font-medium">{getLabel()}</span>
                <Badge
                    variant="outline"
                    className="ml-auto text-xs border-slate-600 text-slate-500 dark:text-slate-500 dark:text-slate-400 capitalize"
                >
                    {status}
                </Badge>
            </div>
            {status !== 'success' && status !== 'completed' &&
                status !== 'failure' && status !== 'failed' && (
                    <Progress value={progress} className="h-1.5 bg-slate-700" />
                )}
            {(status === 'success' || status === 'completed') && (
                <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-xs">
                    Your video has been analyzed. Refresh to see results.
                </p>
            )}
            {(status === 'failure' || status === 'failed') && (
                <p className="text-red-400 text-xs">
                    Analysis failed. Please try again.
                </p>
            )}
        </div>
    )
}