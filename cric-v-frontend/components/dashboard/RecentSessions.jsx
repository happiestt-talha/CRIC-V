import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, getStatusBadgeVariant } from '@/lib/utils/formatters'
import { Video, ArrowRight } from 'lucide-react'

export default function RecentSessions({ sessions = [] }) {
    if (sessions.length === 0) {
        return (
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white text-base">Recent Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Video className="h-10 w-10 text-slate-400 dark:text-slate-600 mb-3" />
                        <p className="text-slate-500 dark:text-slate-400 text-sm">No sessions yet</p>
                        <Link href="/sessions/new" className="mt-3">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                Create First Session
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-slate-900 dark:text-white text-base">Recent Sessions</CardTitle>
                <Link href="/sessions">
                    <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs">
                        View all <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                </Link>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {sessions.slice(0, 5).map((session) => (
                        <Link
                            key={session.id}
                            href={`/sessions/${session.id}`}
                            className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                                <Video className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-slate-900 dark:text-white text-sm font-medium truncate">
                                    {session.title || `Session #${session.id}`}
                                </p>
                                <p className="text-slate-500 dark:text-slate-500 text-xs">
                                    {formatDate(session.created_at)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className="text-xs border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 capitalize">
                                    {session.session_type}
                                </Badge>
                                <Badge variant={getStatusBadgeVariant(session.status)} className="text-xs capitalize">
                                    {session.status}
                                </Badge>
                            </div>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}