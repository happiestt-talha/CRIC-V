'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usersApi } from '@/lib/api/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, Copy, Check, ShieldCheck } from 'lucide-react'
import { BATTING_HANDS, BOWLING_STYLES } from '@/lib/utils/constants'

export default function PlayerForm() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [credentials, setCredentials] = useState(null)
    const [copied, setCopied] = useState(false)
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        age: '',
        batting_hand: 'right',
        bowling_style: 'right_arm_fast',
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const payload = {
                ...form,
                age: form.age ? parseInt(form.age) : null,
            }
            const data = await usersApi.createPlayerWithCredentials(payload)
            setCredentials(data)
            setShowModal(true)
            toast.success('Player created successfully!')
        } catch (err) {
            toast.error('Failed to create player', {
                description: err.response?.data?.detail || 'Something went wrong'
            })
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = () => {
        if (!credentials) return
        const text = `Username: ${credentials.username}\nTemporary Password: ${credentials.temporary_password}\nLogin Link: ${window.location.origin}/login`
        navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success('Credentials copied to clipboard')
        setTimeout(() => setCopied(false), 2000)
    }

    const handleCloseModal = () => {
        setShowModal(false)
        router.push('/players')
    }

    return (
        <>
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-lg">
                <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white">Player Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-500 dark:text-slate-600 dark:text-slate-300">Full Name *</Label>
                            <Input
                                value={form.full_name}
                                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                placeholder="Ahmed Khan"
                                required
                                className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-500 dark:text-slate-600 dark:text-slate-300">Email *</Label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="player@email.com"
                                required
                                className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500"
                            />
                            <p className="text-[12px] text-red-600/80 italic">
                                A welcome email with credentials will be sent to this address.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-500 dark:text-slate-600 dark:text-slate-300">Age</Label>
                            <Input
                                type="number"
                                value={form.age}
                                onChange={(e) => setForm({ ...form, age: e.target.value })}
                                placeholder="22"
                                min={5}
                                max={60}
                                className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-500 dark:text-slate-600 dark:text-slate-300">Batting Hand</Label>
                            <Select
                                value={form.batting_hand}
                                onValueChange={(v) => setForm({ ...form, batting_hand: v })}
                            >
                                <SelectTrigger className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                                    {BATTING_HANDS.map((h) => (
                                        <SelectItem
                                            key={h.value}
                                            value={h.value}
                                            className="text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
                                        >
                                            {h.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-500 dark:text-slate-600 dark:text-slate-300">Bowling Style</Label>
                            <Select
                                value={form.bowling_style}
                                onValueChange={(v) => setForm({ ...form, bowling_style: v })}
                            >
                                <SelectTrigger className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                                    {BOWLING_STYLES.map((s) => (
                                        <SelectItem
                                            key={s.value}
                                            value={s.value}
                                            className="text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
                                        >
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800"
                                onClick={() => router.back()}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 bg-green-600 hover:bg-green-700 text-slate-900 dark:text-white"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Player'
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Dialog open={showModal} onOpenChange={handleCloseModal}>
                <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-w-sm sm:max-w-md">
                    <DialogHeader>
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-green-500/10 rounded-full">
                                <ShieldCheck className="h-8 w-8 text-green-500" />
                            </div>
                        </div>
                        <DialogTitle className="text-center text-xl">Player Account Created</DialogTitle>
                        <DialogDescription className="text-center text-slate-500 dark:text-slate-500 dark:text-slate-400">
                            The following credentials have been generated for {credentials?.full_name || 'the player'}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 my-4">
                        <div className="p-4 bg-slate-200 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500 dark:text-slate-500 uppercase tracking-wider font-semibold">Username</span>
                                <span className="text-slate-900 dark:text-white font-mono">{credentials?.username}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500 dark:text-slate-500 uppercase tracking-wider font-semibold">Password</span>
                                <span className="text-slate-900 dark:text-white font-mono">{credentials?.temporary_password}</span>
                            </div>
                        </div>

                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <p className="text-xs text-amber-200 leading-relaxed text-center">
                                ⚠️ <strong>Action Required:</strong> Please share these credentials with the player. They will be required to change their password on first login.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            className="flex-1 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800"
                            onClick={copyToClipboard}
                        >
                            {copied ? (
                                <><Check className="mr-2 h-4 w-4" /> Copied</>
                            ) : (
                                <><Copy className="mr-2 h-4 w-4" /> Copy Credentials</>
                            )}
                        </Button>
                        <Button
                            className="flex-1 bg-green-600 hover:bg-green-700 text-slate-900 dark:text-white"
                            onClick={handleCloseModal}
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}