'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, File, X, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB

export default function VideoUpload({ onUpload, onUploadComplete }) {
    const [queue, setQueue] = useState([]) // Array of { file, progress, status, id }
    const [dragging, setDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const inputRef = useRef(null)

    const handleFiles = (selectedFiles) => {
        const newFiles = Array.from(selectedFiles).map(file => {
            if (file.size > MAX_FILE_SIZE) {
                toast.error(`File ${file.name} exceeds 500MB limit`)
                return null
            }
            if (!file.type.startsWith('video/')) {
                toast.error(`File ${file.name} is not a video`)
                return null
            }
            return {
                file,
                id: Math.random().toString(36).substr(2, 9),
                progress: 0,
                status: 'pending'
            }
        }).filter(Boolean)

        setQueue(prev => [...prev, ...newFiles])
    }

    const startUploads = async () => {
        if (isUploading) return
        setIsUploading(true)

        // Get snapshot of pending items
        const pending = queue.filter(item => item.status === 'pending')
        
        for (const item of pending) {
            setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'uploading' } : q))
            
            try {
                await onUpload(item.file, (pct) => {
                    setQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: pct } : q))
                })
                
                setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'complete' } : q))
            } catch (err) {
                setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error' } : q))
                toast.error(`Failed to upload ${item.file.name}`)
                break 
            }
        }

        setIsUploading(false)
        if (onUploadComplete) onUploadComplete()
    }

    const removeFile = (id) => {
        setQueue(prev => prev.filter(item => item.id !== id))
    }

    const formatFileSize = (bytes) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
        <div className="space-y-4">
            <div
                className={cn(
                    'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
                    dragging
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-600 bg-slate-100/50 dark:bg-slate-800/50'
                )}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
                onClick={() => inputRef.current?.click()}
            >
                <Upload className="h-10 w-10 text-slate-500 dark:text-slate-500 mx-auto mb-3" />
                <p className="text-slate-900 dark:text-white font-medium text-sm">Drop videos here</p>
                <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">or click to browse — Max 500MB</p>
                <input
                    ref={inputRef}
                    type="file"
                    accept="video/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                />
            </div>

            {queue.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {queue.map((item) => (
                        <div key={item.id} className="p-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg border border-slate-300 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <File className={cn("h-4 w-4 shrink-0", item.status === 'complete' ? "text-green-400" : "text-slate-500 dark:text-slate-500 dark:text-slate-400")} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-slate-900 dark:text-white text-[11px] font-medium truncate pr-4">{item.file.name}</p>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-500 uppercase font-bold">{item.status}</span>
                                    </div>
                                    <Progress value={item.progress} className="h-1 bg-slate-700" />
                                </div>
                                {item.status === 'pending' && (
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-500 dark:text-slate-500" onClick={() => removeFile(item.id)}>
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                                {item.status === 'complete' && <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {queue.some(i => i.status === 'pending') && (
                <Button className="w-full bg-green-600 hover:bg-green-700 text-slate-900 dark:text-white" onClick={startUploads} disabled={isUploading}>
                    {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : 'Start Uploading'}
                </Button>
            )}
        </div>
    )
}