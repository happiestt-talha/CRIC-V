'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { validateVideoUrl, importVideoFromUrl } from '@/lib/api/sessions'
import { API_BASE_URL } from '@/lib/utils/constants'
import { toast } from 'sonner'
import { Link, Play, CheckCircle, AlertCircle, Clock, Download, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Cookies from 'js-cookie'

const SUPPORTED_EXAMPLES = [
  'https://www.youtube.com/watch?v=...',
  'https://youtu.be/...',
  'https://example.com/video.mp4'
]

export default function UrlImport({ sessionId, onSuccess }) {
  const [url, setUrl] = useState('')
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState(null) // null | { valid, type, title, duration, error }
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressStage, setProgressStage] = useState('')
  const [taskId, setTaskId] = useState(null)
  const [importComplete, setImportComplete] = useState(false)
  const esRef = useRef(null)
  const validateTimeoutRef = useRef(null)

  // Auto-validate URL after user stops typing (800ms debounce)
  useEffect(() => {
    setValidation(null)
    if (!url || url.length < 10) return
    if (!url.startsWith('http')) return

    clearTimeout(validateTimeoutRef.current)
    validateTimeoutRef.current = setTimeout(async () => {
      setValidating(true)
      try {
        const res = await validateVideoUrl(sessionId, url)
        setValidation(res.data)
      } catch (err) {
        setValidation({
          valid: false,
          error: err.response?.data?.detail || 'Validation failed. Please check the URL.'
        })
      } finally {
        setValidating(false)
      }
    }, 800)

    return () => clearTimeout(validateTimeoutRef.current)
  }, [url, sessionId])

  // SSE progress tracking
  useEffect(() => {
    if (!taskId) return

    const token = Cookies.get('access_token')
    const es = new EventSource(
      `${API_BASE_URL}/analysis/progress/${taskId}`,
      { withCredentials: true }
    )
    esRef.current = es

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setProgress(data.percent || 0)
        setProgressStage(data.stage || '')

        if (data.status === 'complete') {
          es.close()
          setImporting(false)
          setImportComplete(true)
          toast.success('Video imported successfully!', {
            description: 'You can now analyze this video.'
          })
          if (onSuccess) onSuccess()
        } else if (data.status === 'failed') {
          es.close()
          setImporting(false)
          toast.error('Import failed', { description: data.stage })
        }
      } catch (e) {
        console.error('SSE parse error:', e)
      }
    }

    es.onerror = () => {
      es.close()
      setImporting(false)
      toast.error('Lost connection to server during import.')
    }

    return () => es.close()
  }, [taskId, onSuccess])

  const handleImport = async () => {
    if (!validation?.valid) return
    setImporting(true)
    setProgress(0)
    setProgressStage('Starting...')
    setImportComplete(false)

    try {
      const res = await importVideoFromUrl(sessionId, url)
      setTaskId(res.data.task_id)
    } catch (err) {
      setImporting(false)
      toast.error('Failed to start import', {
        description: err.response?.data?.detail || 'Please try again.'
      })
    }
  }

  const handleReset = () => {
    setUrl('')
    setValidation(null)
    setImportComplete(false)
    setProgress(0)
    setProgressStage('')
    setTaskId(null)
    if (esRef.current) esRef.current.close()
  }

  const formatDuration = (seconds) => {
    if (!seconds) return null
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
          Only import publicly available cricket training videos. Do not import
          copyrighted match footage. Maximum video length: 10 minutes.
        </p>
      </div>

      {/* URL Input */}
      <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Video URL
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or direct MP4 URL"
                  className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono text-sm h-12"
                  disabled={importing || importComplete}
                />
                {/* Validation status indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {validating && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
                  {!validating && validation?.valid && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {!validating && validation && !validation.valid && <AlertCircle className="w-4 h-4 text-red-500" />}
                </div>
              </div>
            </div>

            {/* Supported formats hint */}
            <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest">
              Supported: YouTube URLs · Direct MP4/MOV/AVI links
            </p>
          </div>

          {/* Validation Result */}
          {validation && !validating && (
            <div className={cn(
              "rounded-xl p-4 border space-y-2 animate-in fade-in slide-in-from-top-1 duration-300",
              validation.valid
                ? "bg-green-500/10 border-green-500/20"
                : "bg-red-500/10 border-red-500/20"
            )}>
              {validation.valid ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {validation.type === 'youtube' ? (
                      <Play className="w-4 h-4 text-red-500" />
                    ) : (
                      <Link className="w-4 h-4 text-blue-500" />
                    )}
                    <p className="text-sm font-black text-green-400 truncate">
                      {validation.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge className="bg-green-500/10 text-green-500 border-none text-[9px] font-black uppercase">
                      ✓ Available
                    </Badge>
                    {validation.type && (
                      <Badge className="bg-slate-800 text-slate-400 border-none text-[9px] font-black uppercase">
                        {validation.type === 'youtube' ? '▶ YouTube' : '🔗 Direct URL'}
                      </Badge>
                    )}
                    {validation.duration_seconds && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                        <Clock className="w-3 h-3" />
                        {formatDuration(validation.duration_seconds)}
                      </span>
                    )}
                    {validation.uploader && (
                      <span className="text-[10px] text-slate-500 font-bold">
                        by {validation.uploader}
                      </span>
                    )}
                  </div>
                  {validation.thumbnail && (
                    <img
                      src={validation.thumbnail}
                      alt="Video thumbnail"
                      className="w-full max-w-[200px] rounded-lg aspect-video object-cover border border-slate-700"
                    />
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400 font-bold">{validation.error}</p>
                </div>
              )}
            </div>
          )}

          {/* Import Button */}
          {!importing && !importComplete && (
            <Button
              onClick={handleImport}
              disabled={!validation?.valid || validating}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-black text-xs uppercase tracking-widest disabled:opacity-40"
            >
              <Download className="w-4 h-4 mr-2" />
              Import Video
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Progress Panel */}
      {(importing || importComplete) && (
        <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                {importComplete ? 'Import Complete' : 'Importing Video'}
              </p>
              {importComplete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs text-slate-500 hover:text-slate-300 font-black uppercase tracking-widest h-7"
                >
                  Import Another
                </Button>
              )}
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <Progress
                value={progress}
                className="h-2 bg-slate-200 dark:bg-slate-800"
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500 font-bold">{progressStage}</p>
                <p className="text-xs font-black text-green-500">{progress}%</p>
              </div>
            </div>

            {/* Stage indicators */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Validating', threshold: 5 },
                { label: 'Downloading', threshold: 50 },
                { label: 'Ready', threshold: 100 },
              ].map((stage, i) => (
                <div key={i} className={cn(
                  "text-center p-2 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all",
                  progress >= stage.threshold
                    ? "bg-green-500/10 border-green-500/20 text-green-500"
                    : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-700"
                )}>
                  {progress >= stage.threshold ? '✓' : '○'} {stage.label}
                </div>
              ))}
            </div>

            {importComplete && (
              <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-black text-green-400">Video imported successfully</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                    Scroll down to see the video in your media list and start analysis.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Supported platforms info */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            icon: <Play className="w-5 h-5 text-red-500" />,
            title: 'YouTube',
            desc: 'Public videos up to 10 minutes. Shorts supported.',
            supported: true
          },
          {
            icon: <Link className="w-5 h-5 text-blue-500" />,
            title: 'Direct Links',
            desc: 'Any public .mp4, .mov, or .avi URL under 500MB.',
            supported: true
          },
        ].map((platform, i) => (
          <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/50 rounded-xl space-y-2 shadow-sm">
            <div className="flex items-center gap-2">
              {platform.icon}
              <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                {platform.title}
              </span>
              <Badge className="ml-auto bg-green-500/10 text-green-500 border-none text-[8px] font-black">
                Supported
              </Badge>
            </div>
            <p className="text-[10px] text-slate-600 font-bold leading-relaxed">{platform.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
