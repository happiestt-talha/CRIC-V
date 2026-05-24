'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import PageHeader from '@/components/layout/PageHeader'
import VideoUpload from '@/components/sessions/VideoUpload'
import AnalysisStatus from '@/components/sessions/AnalysisStatus'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { sessionsApi } from '@/lib/api/sessions'
import { analysisApi } from '@/lib/api/analysis'
import { usePlayers } from '@/lib/hooks/usePlayers'
import { toast } from 'sonner'
import { CheckCircle2, Loader2 } from 'lucide-react'

const STEPS = ['Session Info', 'Upload Video', 'Analyze']

export default function NewSessionPage() {
    const router = useRouter()
    const { players } = usePlayers()
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        session_type: 'bowling',
        player_id: '',
        description: '',
    })

    // Create session
    const handleCreateSession = async (e) => {
        e.preventDefault()
        if (!form.player_id) {
            toast.error('Please select a player')
            return
        }
        setLoading(true)
        try {
            const created = await sessionsApi.createSession({
                ...form,
                player_id: parseInt(form.player_id),
            })
            toast.success('Session created!', { description: 'Now upload your videos.' })
            router.push(`/sessions/${created.id}/upload`)
        } catch (err) {
            toast.error('Failed to create session', {
                description: err.response?.data?.detail || 'Something went wrong',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar title="New Session" />
            <div className="flex-1 p-6">
                <PageHeader
                    title="New Training Session"
                    description="Step 1: Session Information"
                    backHref="/sessions"
                    backLabel="Sessions"
                />

                {/* Stepper */}
                <div className="flex items-center gap-2 mb-8">
                    {[
                        { label: 'Session Info', active: true, done: false },
                        { label: 'Upload Videos', active: false, done: false },
                        { label: 'Analyze', active: false, done: false }
                    ].map((s, i) => (
                        <div key={s.label} className="flex items-center gap-2">
                            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${s.done
                                    ? 'bg-green-600 text-slate-900 dark:text-white'
                                    : s.active
                                        ? 'bg-green-600/30 text-green-400 border border-green-600'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500'
                                }`}>
                                {s.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                            </div>
                            <span className={`text-sm font-medium ${s.active ? 'text-slate-900 dark:text-white' : s.done ? 'text-green-400' : 'text-slate-500 dark:text-slate-500'
                                }`}>{s.label}</span>
                            {i < 2 && (
                                <div className={`h-px w-8 mx-1 ${s.done ? 'bg-green-600' : 'bg-slate-700'}`} />
                            )}
                        </div>
                    ))}
                </div>

                <div className="max-w-xl">
                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-slate-900 dark:text-white text-base">Session Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateSession} className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-500 dark:text-slate-600 dark:text-slate-300">Player *</Label>
                                    <Select
                                        value={form.player_id}
                                        onValueChange={(v) => setForm({ ...form, player_id: v })}
                                    >
                                        <SelectTrigger className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                                            <SelectValue placeholder="Select a player" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                                            {players.map((p) => (
                                                <SelectItem
                                                    key={p.id}
                                                    value={String(p.id)}
                                                    className="text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
                                                >
                                                    {p.full_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-500 dark:text-slate-600 dark:text-slate-300">Session Type *</Label>
                                    <Select
                                        value={form.session_type}
                                        onValueChange={(v) => setForm({ ...form, session_type: v })}
                                    >
                                        <SelectTrigger className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                                            <SelectItem value="bowling" className="text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700">Bowling</SelectItem>
                                            <SelectItem value="batting" className="text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700">Batting</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-500 dark:text-slate-600 dark:text-slate-300">Description</Label>
                                    <Textarea
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Optional session notes..."
                                        className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500 resize-none"
                                        rows={3}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-green-600 hover:bg-green-700 text-slate-900 dark:text-white"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                                    ) : 'Create Session & Continue'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}