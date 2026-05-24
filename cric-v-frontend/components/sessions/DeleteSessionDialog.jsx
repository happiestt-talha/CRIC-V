'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { sessionsApi } from "@/lib/api/sessions"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import { AlertTriangle, Trash2, Info } from "lucide-react"
import { toast } from "sonner"

export default function DeleteSessionDialog({ sessionId, open, onOpenChange, onSuccess }) {
    const [loading, setLoading] = useState(false)
    const [preview, setPreview] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (open && sessionId) {
            fetchPreview()
        } else {
            setPreview(null)
            setError(null)
        }
    }, [open, sessionId])

    const fetchPreview = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await sessionsApi.getDeletePreview(sessionId)
            setPreview(data)
        } catch (err) {
            console.error("Failed to fetch delete preview:", err)
            setError("Could not load session details. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        setError(null)
        try {
            await sessionsApi.deleteSession(sessionId)
            toast.success("Session deleted successfully")
            onOpenChange(false)
            if (onSuccess) onSuccess(sessionId)
        } catch (err) {
            const msg = err.response?.data?.detail || "Failed to delete session. Please try again."
            setError(msg)
            toast.error("Deletion failed")
        } finally {
            setDeleting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-red-500 flex items-center gap-2">
                        <Trash2 className="h-5 w-5" />
                        Delete Session?
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-500 dark:text-slate-400">
                        This action is permanent and cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <LoadingSpinner text="Fetching session details..." />
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
                            <Button
                                variant="link"
                                className="text-red-400 h-auto p-0 ml-2 underline"
                                onClick={fetchPreview}
                            >
                                Retry
                            </Button>
                        </div>
                    ) : preview ? (
                        <div className="space-y-4">
                            {preview.has_analysis && (
                                <div className="flex gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-xs">
                                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                                    <p className='text-red-600'>⚠️ Analysis results will be permanently lost.</p>
                                </div>
                            )}

                            {preview.has_feedback && (
                                <div className="flex gap-3 p-3 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-600 dark:text-slate-300 text-xs">
                                    <Info className="h-4 w-4 text-blue-400 shrink-0" />
                                    <p className='text-blue-600'>This session also has coach feedback that will be deleted.</p>
                                </div>
                            )}

                            {preview.is_currently_processing && (
                                <div className="flex gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-xs">
                                    <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                                    <p>⚠️ Analysis is currently running on this session. It will be cancelled.</p>
                                </div>
                            )}

                            <p className="text-slate-500 dark:text-slate-600 dark:text-slate-300 text-sm">
                                This will permanently delete <strong>{preview.video_count} video(s)</strong> ({preview.total_size_mb} MB) and all associated data. This action cannot be undone.
                            </p>
                        </div>
                    ) : null}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={deleting}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleting || loading || !!error}
                        className="bg-red-600 hover:bg-red-700 text-slate-900 dark:text-white"
                    >
                        {deleting ? (
                            <>
                                <LoadingSpinner className="mr-2 h-4 w-4" />
                                Deleting...
                            </>
                        ) : preview?.is_currently_processing ? (
                            "Cancel Analysis & Delete"
                        ) : (
                            "Delete Permanently"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
