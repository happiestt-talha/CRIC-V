import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, getStatusBadgeVariant } from '@/lib/utils/formatters'
import { Video, ArrowRight, Clock, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import DeleteSessionDialog from './DeleteSessionDialog'
import { useState } from 'react'

export default function SessionCard({ session, onDeleteSuccess }) {
    const { user } = useAuth()
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const isCoachOrAdmin = user?.role === 'coach' || user?.role === 'admin'

    return (
        <>
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700 transition-colors relative group">
                {isCoachOrAdmin && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 text-red-500/80 border-red-500/50 bg-red-800/20 hover:text-red-800 hover:bg-red-600/60 opacity-0 group-hover:opacity-100 opacity-70 hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setDeleteDialogOpen(true)
                        }}
                    >
                        <Trash2 className="h-4 w-4" aria-label="Delete session" />
                    </Button>
                )}
                <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                            <Video className="h-4 w-4 text-slate-500 dark:text-slate-500 dark:text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-slate-900 dark:text-white font-semibold text-sm truncate pr-6">
                                {session.title || `Session #${session.id}`}
                            </h3>
                            <div className="flex items-center gap-1 mt-0.5">
                                <Clock className="h-3 w-3 text-slate-500 dark:text-slate-500" />
                                <p className="text-slate-500 dark:text-slate-500 text-xs">
                                    {formatDate(session.created_at)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                        <Badge
                            variant="outline"
                            className="text-xs border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-500 dark:text-slate-400 capitalize"
                        >
                            {session.session_type}
                        </Badge>
                        <Badge
                            variant={getStatusBadgeVariant(session.status)}
                            className="text-xs capitalize"
                        >
                            {session.status}
                        </Badge>
                    </div>

                    {session.description && (
                        <p className="text-slate-500 dark:text-slate-500 text-xs mb-4 line-clamp-2">
                            {session.description}
                        </p>
                    )}

                    <Link href={`/sessions/${session.id}`}>
                        <Button
                            size="sm"
                            className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700"
                        >
                            View Details
                            <ArrowRight className="ml-2 h-3 w-3" />
                        </Button>
                    </Link>
                </CardContent>
            </Card>

            <DeleteSessionDialog
                sessionId={session.id}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onSuccess={() => {
                    if (onDeleteSuccess) onDeleteSuccess(session.id)
                }}
            />
        </>
    )
}