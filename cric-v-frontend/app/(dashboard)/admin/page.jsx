'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
import PageHeader from '@/components/layout/PageHeader'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { adminApi } from '@/lib/api/admin'
import { formatDate, getStatusBadgeVariant } from '@/lib/utils/formatters'
import { toast } from 'sonner'
import {
    Users,
    Video,
    BarChart3,
    HardDrive,
    Trash2,
    Shield,
} from 'lucide-react'

export default function AdminPage() {

    const [stats, setStats] = useState(null)
    const [users, setUsers] = useState([])
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState(null)

    useEffect(() => {
        Promise.all([
            adminApi.getStats(),
            adminApi.getUsers(),
            adminApi.getSessions(),
        ])
            .then(([s, u, sess]) => {
                setStats(s)
                setUsers(Array.isArray(u) ? u : [])
                setSessions(Array.isArray(sess) ? sess : [])
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const handleDelete = async (sessionId) => {
        setDeletingId(sessionId)
        try {
            await adminApi.deleteSession(sessionId)
            setSessions((prev) => prev.filter((s) => s.id !== sessionId))
            toast.success('Session deleted successfully')
        } catch {
            toast.error('Failed to delete session')
        } finally {
            setDeletingId(null)
        }
    }

    if (loading) {
        return (
            <ProtectedRoute requireAdmin>
                <div className="flex flex-col min-h-screen">
                    <Navbar title="Admin" />
                    <div className="flex-1 flex items-center justify-center">
                        <LoadingSpinner text="Loading admin data..." />
                    </div>
                </div>
            </ProtectedRoute>
        )
    }

    return (
        <ProtectedRoute requireAdmin>
            <div className="flex flex-col min-h-screen">
                <Navbar title="Admin Panel" />
                <div className="flex-1 p-6">
                    <PageHeader
                        title="Admin Panel"
                        description="System-wide statistics and management"
                        action={
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600/20 border border-amber-600/30">
                                <Shield className="h-4 w-4 text-amber-400" />
                                <span className="text-amber-400 text-sm font-medium">Admin Access</span>
                            </div>
                        }
                    />

                    {/* Stats */}
                    {stats && (
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                            {[
                                { label: 'Total Users', value: stats.total_users, icon: Users, color: 'text-blue-400', bg: 'bg-blue-600/20' },
                                { label: 'Total Sessions', value: stats.total_sessions, icon: Video, color: 'text-green-400', bg: 'bg-green-600/20' },
                                { label: 'Total Analyses', value: stats.total_analyses, icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-600/20' },
                                {
                                    label: 'Storage Used',
                                    value: stats.storage_used_mb ? `${Number(stats.storage_used_mb).toFixed(1)} MB` : '—',
                                    icon: HardDrive,
                                    color: 'text-amber-400',
                                    bg: 'bg-amber-600/20',
                                },
                            ].map((s) => {
                                const Icon = s.icon
                                return (
                                    <Card key={s.label} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                        <CardContent className="p-5 flex items-center gap-4">
                                            <div className={`p-3 rounded-xl ${s.bg}`}>
                                                <Icon className={`h-5 w-5 ${s.color}`} />
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value ?? '—'}</p>
                                                <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-xs">{s.label}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}

                    {/* Users table */}
                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 mb-6">
                        <CardHeader>
                            <CardTitle className="text-slate-900 dark:text-white text-base">All Users</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                                        <TableHead className="text-slate-500 dark:text-slate-500 dark:text-slate-400">Username</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-500 dark:text-slate-400">Email</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-500 dark:text-slate-400">Role</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-500 dark:text-slate-400">Status</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-500 dark:text-slate-400">Joined</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id} className="border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:bg-slate-800/50">
                                            <TableCell className="text-slate-900 dark:text-white font-medium">
                                                {user.username}
                                            </TableCell>
                                            <TableCell className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm">
                                                {user.email}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="capitalize text-xs border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-500 dark:text-slate-400"
                                                >
                                                    {user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={user.is_active ? 'default' : 'destructive'}
                                                    className="text-xs"
                                                >
                                                    {user.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm">
                                                {formatDate(user.created_at)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {users.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-slate-500 dark:text-slate-500 py-8">
                                                No users found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Sessions table */}
                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-slate-900 dark:text-white text-base">All Sessions</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                                        <TableHead className="text-slate-500 dark:text-slate-500 dark:text-slate-400">ID</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-500 dark:text-slate-400">Type</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-500 dark:text-slate-400">Status</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-500 dark:text-slate-400">Player</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-500 dark:text-slate-400">Created</TableHead>
                                        <TableHead className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessions.map((session) => (
                                        <TableRow key={session.id} className="border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:bg-slate-800/50">
                                            <TableCell className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm">
                                                #{session.id}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="capitalize text-xs border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-500 dark:text-slate-400"
                                                >
                                                    {session.session_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={getStatusBadgeVariant(session.status)}
                                                    className="text-xs capitalize"
                                                >
                                                    {session.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm">
                                                #{session.player_id}
                                            </TableCell>
                                            <TableCell className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm">
                                                {formatDate(session.created_at)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-7 w-7 p-0"
                                                            disabled={deletingId === session.id}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="text-slate-900 dark:text-white">
                                                                Delete Session #{session.id}?
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription className="text-slate-500 dark:text-slate-500 dark:text-slate-400">
                                                                This will permanently delete the session, its video, and all
                                                                analysis data. This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700">
                                                                Cancel
                                                            </AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(session.id)}
                                                                className="bg-red-600 hover:bg-red-700 text-slate-900 dark:text-white"
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {sessions.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-slate-500 dark:text-slate-500 py-8">
                                                No sessions found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </ProtectedRoute>
    )
}