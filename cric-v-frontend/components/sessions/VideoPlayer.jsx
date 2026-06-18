'use client'

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Maximize, Minimize, Camera, AlertCircle,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from '@/components/ui/tooltip'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Format seconds → MM:SS */
const fmtTime = (s) => {
  if (!s || !isFinite(s)) return '00:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

/** Format seconds → MM:SS:FF (frame-accurate) */
const fmtTimeFrames = (s, fps) => {
  if (!s || !isFinite(s)) return '00:00:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const frame = Math.floor((s % 1) * fps)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(frame).padStart(2, '0')}`
}

const clamp = (val, min, max) => Math.min(Math.max(val, min), max)

// ── Speed options ────────────────────────────────────────────────────────────
const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1]

// ─────────────────────────────────────────────────────────────────────────────
// VideoPlayer Component
// ─────────────────────────────────────────────────────────────────────────────

const VideoPlayer = ({
  src,
  deliveries = [],
  sessionId,
  fps = 30,
  className,
  // Legacy props — kept for backward compat
  seekToSeconds,
}) => {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const progressRef = useRef(null)

  // ── State ────────────────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeDeliveryId, setActiveDeliveryId] = useState(null)
  const [buffered, setBuffered] = useState(0) // fraction 0-1
  const [videoError, setVideoError] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [isMouseIdle, setIsMouseIdle] = useState(false)

  const frameDuration = 1 / fps

  // The actual src fed to the <video> element
  const activeSrc = src

  // ── Idle Mouse Detection ──────────────────────────────────────────────────
  useEffect(() => {
    let idleTimer
    const resetIdle = () => {
      setIsMouseIdle(false)
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => setIsMouseIdle(true), 2500)
    }

    const c = containerRef.current
    if (c) {
      c.addEventListener('mousemove', resetIdle)
      c.addEventListener('mouseleave', () => setIsMouseIdle(true))
      // Trigger initially
      resetIdle()
    }
    return () => {
      clearTimeout(idleTimer)
      if (c) {
        c.removeEventListener('mousemove', resetIdle)
        c.removeEventListener('mouseleave', () => setIsMouseIdle(true))
      }
    }
  }, [isPlaying])

  // ── Backward-compat: seekToSeconds prop ──────────────────────────────────
  useEffect(() => {
    if (
      videoRef.current &&
      seekToSeconds !== undefined &&
      seekToSeconds !== null &&
      seekToSeconds > 0
    ) {
      videoRef.current.currentTime = seekToSeconds
      videoRef.current.play().catch(() => {})
    }
  }, [seekToSeconds])

  // ── Reset error on src change ────────────────────────────────────────────
  useEffect(() => {
    setVideoError(false)
  }, [activeSrc])

  // ── Video event listeners ────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onTimeUpdate = () => {
      if (!isSeeking) setCurrentTime(v.currentTime)
    }
    const onLoadedMetadata = () => {
      setDuration(v.duration)
      v.playbackRate = playbackRate
    }
    const onProgress = () => {
      if (v.buffered.length > 0) {
        setBuffered(v.buffered.end(v.buffered.length - 1) / (v.duration || 1))
      }
    }
    const onEnded = () => setIsPlaying(false)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onError = () => setVideoError(true)
    const onLoadStart = () => setVideoError(false)

    v.addEventListener('timeupdate', onTimeUpdate)
    v.addEventListener('loadedmetadata', onLoadedMetadata)
    v.addEventListener('progress', onProgress)
    v.addEventListener('ended', onEnded)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('error', onError)
    v.addEventListener('loadstart', onLoadStart)

    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate)
      v.removeEventListener('loadedmetadata', onLoadedMetadata)
      v.removeEventListener('progress', onProgress)
      v.removeEventListener('ended', onEnded)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('error', onError)
      v.removeEventListener('loadstart', onLoadStart)
    }
  }, [isSeeking, playbackRate])

  // ── Fullscreen change listener ───────────────────────────────────────────
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // ── Playback controls ────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play().catch(() => {})
    } else {
      v.pause()
    }
  }, [])

  const stepFrame = useCallback(
    (direction) => {
      const v = videoRef.current
      if (!v) return
      v.pause()
      const next = clamp(v.currentTime + direction * frameDuration, 0, v.duration || 0)
      v.currentTime = next
      setCurrentTime(next)
    },
    [frameDuration],
  )

  const seekBy = useCallback((seconds) => {
    const v = videoRef.current
    if (!v) return
    const next = clamp(v.currentTime + seconds, 0, v.duration || 0)
    v.currentTime = next
    setCurrentTime(next)
  }, [])

  const changeSpeed = useCallback((rate) => {
    const v = videoRef.current
    setPlaybackRate(rate)
    if (v) v.playbackRate = rate
  }, [])

  const toggleMute = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setIsMuted(v.muted)
  }, [])

  const changeVolume = useCallback((val) => {
    const v = videoRef.current
    if (!v) return
    v.volume = val
    setVolume(val)
    if (val === 0) {
      v.muted = true
      setIsMuted(true)
    } else if (v.muted) {
      v.muted = false
      setIsMuted(false)
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    const c = containerRef.current
    if (!c) return
    if (!document.fullscreenElement) {
      c.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])



  // ── Jump to delivery ─────────────────────────────────────────────────────
  const jumpToDelivery = useCallback(
    (delivery) => {
      const v = videoRef.current
      if (!v) return
      v.pause()

      v.currentTime = delivery.release_timestamp_seconds
      setCurrentTime(delivery.release_timestamp_seconds)
      setActiveDeliveryId(delivery.id ?? delivery.delivery_id)
    },
    [],
  )

  // ── Screenshot / Export frame ────────────────────────────────────────────
  const exportFrame = useCallback(() => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return

    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(v, 0, 0)

    // Watermark
    const fontSize = Math.max(14, Math.round(v.videoWidth * 0.015))
    const padding = fontSize * 0.6
    const timestamp = fmtTime(v.currentTime)
    const lines = ['CRIC-V', timestamp]

    ctx.font = `bold ${fontSize}px sans-serif`
    const maxLineWidth = Math.max(
      ctx.measureText(lines[0]).width,
      ctx.measureText(lines[1]).width,
    )
    const pillW = maxLineWidth + padding * 2
    const pillH = fontSize * lines.length + padding * 2 + 4
    const x = v.videoWidth - pillW - fontSize
    const y = v.videoHeight - pillH - fontSize

    // Pill background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
    const r = fontSize * 0.4
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + pillW - r, y)
    ctx.quadraticCurveTo(x + pillW, y, x + pillW, y + r)
    ctx.lineTo(x + pillW, y + pillH - r)
    ctx.quadraticCurveTo(x + pillW, y + pillH, x + pillW - r, y + pillH)
    ctx.lineTo(x + r, y + pillH)
    ctx.quadraticCurveTo(x, y + pillH, x, y + pillH - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.fill()

    // Text
    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'top'
    ctx.font = `bold ${fontSize}px sans-serif`
    ctx.fillText('CRIC-V', x + padding, y + padding)
    ctx.font = `${fontSize * 0.85}px sans-serif`
    ctx.fillText(timestamp, x + padding, y + padding + fontSize + 4)

    const ts = fmtTime(v.currentTime).replace(/:/g, '-')
    const filename = `cricv_frame_${sessionId || 'session'}_${ts}.png`

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Frame exported!')
    }, 'image/png')
  }, [sessionId])

  // ── Progress bar pointer interaction (seek + drag) ───────────────────────
  const seekFromEvent = useCallback(
    (e) => {
      const bar = progressRef.current
      const v = videoRef.current
      if (!bar || !v || !duration) return
      const rect = bar.getBoundingClientRect()
      const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1)
      const t = ratio * duration
      v.currentTime = t
      setCurrentTime(t)
    },
    [duration],
  )

  const onProgressPointerDown = useCallback(
    (e) => {
      e.preventDefault()
      setIsSeeking(true)
      seekFromEvent(e)

      const onMove = (ev) => seekFromEvent(ev)
      const onUp = () => {
        setIsSeeking(false)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [seekFromEvent],
  )

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase()
      const isEditable =
        tag === 'input' ||
        tag === 'textarea' ||
        document.activeElement?.isContentEditable
      if (isEditable) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowRight':
          e.preventDefault()
          if (e.shiftKey) seekBy(5)
          else stepFrame(1)
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (e.shiftKey) seekBy(-5)
          else stepFrame(-1)
          break
        case '1':
          changeSpeed(0.25)
          break
        case '2':
          changeSpeed(0.5)
          break
        case '3':
          changeSpeed(0.75)
          break
        case '4':
          changeSpeed(1)
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break

        case 's':
        case 'S':
          exportFrame()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePlay, stepFrame, seekBy, changeSpeed, toggleFullscreen, exportFrame])

  // ── Delivery pills (memoized) ────────────────────────────────────────────
  const deliveryPills = useMemo(() => {
    if (!deliveries || deliveries.length === 0) return null
    return (
      <div className="flex gap-1.5 overflow-x-auto py-1.5 px-1 scrollbar-hide">
        {deliveries.map((d, i) => {
          const id = d.id ?? d.delivery_id
          const isActive = activeDeliveryId === id
          return (
            <button
              key={id ?? i}
              onClick={() => jumpToDelivery(d)}
              className={cn(
                'shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer whitespace-nowrap',
                isActive
                  ? 'bg-green-600 text-white border-green-500 shadow-md shadow-green-900/30'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-700/60 hover:text-slate-200 hover:border-slate-600',
              )}
            >
              D{i + 1}
            </button>
          )
        })}
      </div>
    )
  }, [deliveries, activeDeliveryId, jumpToDelivery])

  // ── Progress percentage ──────────────────────────────────────────────────
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedPct = buffered * 100

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={containerRef}
        className={cn(
          'relative w-full h-full bg-black flex items-center justify-center overflow-hidden',
          isFullscreen ? 'fixed inset-0 z-50' : 'rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl',
          (isMouseIdle && isPlaying) ? 'cursor-none' : 'cursor-default',
          className,
        )}
      >
        {/* ── Video element ── */}
        {activeSrc && !videoError ? (
          <video
            ref={videoRef}
            src={activeSrc}
            preload="metadata"
            className="w-full h-full object-contain"
            playsInline
            onClick={togglePlay}
            crossOrigin="anonymous"
          >
            Your browser does not support the video tag.
          </video>
        ) : null}

        {/* Error / Empty state overlay */}
        {(videoError || !activeSrc) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-500 gap-4 p-6 text-center z-10">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner">
              <AlertCircle className="w-8 h-8 text-red-500/50" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest">
                {videoError ? 'CRITICAL: DECODE ERROR' : 'WAITING FOR SOURCE'}
              </p>
              <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed font-medium">
                {videoError
                  ? 'The video file format is unsupported or the link has expired.'
                  : 'No media source has been linked to this session yet.'}
              </p>
            </div>
          </div>
        )}

        {/* ── Top Floating Overlay (Deliveries) ── */}
        <div
          className={cn(
            'absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 pointer-events-none flex justify-between items-start',
            (isMouseIdle && isPlaying) ? 'opacity-0' : 'opacity-100'
          )}
        >
          {deliveryPills && (
            <div className="pointer-events-auto w-full">
              {deliveryPills}
            </div>
          )}
        </div>

        {/* ── Bottom Floating Controls ── */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 px-4 pt-12 pb-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 z-20',
            (isMouseIdle && isPlaying) ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
          )}
        >
          {/* Progress bar */}
          <div
            ref={progressRef}
            onPointerDown={onProgressPointerDown}
            className="relative w-full h-1.5 mb-4 bg-white/20 hover:h-2 transition-all rounded-full cursor-pointer group touch-none"
          >
            {/* Buffered */}
            <div
              className="absolute inset-y-0 left-0 bg-white/30 rounded-full pointer-events-none"
              style={{ width: `${bufferedPct}%` }}
            />
            {/* Progress */}
            <div
              className="absolute inset-y-0 left-0 bg-green-500 rounded-full pointer-events-none transition-none"
              style={{ width: `${progressPct}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progressPct}%`, marginLeft: '-7px' }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-3 flex-wrap text-white">
            {/* Play / Pause */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={togglePlay}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Space</TooltipContent>
            </Tooltip>

            {/* Frame stepping */}
            <div className="flex items-center gap-1 bg-white/10 rounded-full p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => stepFrame(-1)}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">← Prev Frame</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => stepFrame(1)}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">→ Next Frame</TooltipContent>
              </Tooltip>
            </div>

            {/* Volume */}
            <div
              className="relative flex items-center group/volume"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleMute}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  {isMuted ? 'Unmute' : 'Mute'}
                </TooltipContent>
              </Tooltip>

              {showVolumeSlider && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 z-10">
                  <div className="bg-slate-900/90 backdrop-blur border border-slate-700/50 rounded-lg p-2.5 shadow-xl">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => changeVolume(parseFloat(e.target.value))}
                      className="h-[80px] w-1.5 accent-green-500 cursor-pointer appearance-none bg-slate-700 rounded-full outline-none"
                      style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Time display */}
            <div className="flex items-center gap-1 select-none opacity-90">
              <span className="text-xs font-mono font-medium tabular-nums">
                {fmtTimeFrames(currentTime, fps)}
              </span>
              <span className="text-xs text-white/50">/</span>
              <span className="text-xs font-mono font-medium text-white/50 tabular-nums">
                {fmtTime(duration)}
              </span>
            </div>

            {/* Spacer */}
            <div className="flex-1" />



            {/* Speed buttons */}
            <div className="hidden sm:flex items-center bg-white/10 rounded-full p-0.5 gap-0.5">
              {SPEED_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => changeSpeed(s)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer',
                    playbackRate === s
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/10',
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Mobile speed: compact dropdown-style */}
            <div className="sm:hidden relative">
              <select
                value={playbackRate}
                onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                className="appearance-none bg-white/10 text-white text-[10px] font-bold px-3 py-1.5 rounded-full border-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                {SPEED_OPTIONS.map((s) => (
                  <option key={s} value={s} className="text-black">
                    {s}x
                  </option>
                ))}
              </select>
            </div>

            {/* Screenshot */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={exportFrame}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Screenshot (S)</TooltipContent>
            </Tooltip>

            {/* Fullscreen */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleFullscreen}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                >
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4" />
                  ) : (
                    <Maximize className="w-4 h-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Fullscreen (F)</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default VideoPlayer
