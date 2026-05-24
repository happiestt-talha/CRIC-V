'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function RegisterPage() {
    const router = useRouter()
    const { register } = useAuth()
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        email: '',
        username: '',
        password: '',
        role: 'coach',
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await register(form)
            toast.success('Account created!')
            router.push(`/register/verify-email?email=${encodeURIComponent(form.email)}`)
        } catch (err) {
            toast.error('Registration failed', {
                description: err.response?.data?.detail || 'Something went wrong'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-200 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-600 mb-4">
                        <span className="text-2xl">🏏</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">CRIC-V</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Create your account</p>
                </div>

                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-slate-900 dark:text-white text-xl">Register</CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-400">
                            Join the CRIC-V coaching platform
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    required
                                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-slate-700 dark:text-slate-300">Username</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="johndoe"
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    required
                                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Password</Label>
                                <PasswordInput
                                    id="password"
                                    placeholder="Min 8 characters"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required
                                    minLength={8}
                                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 dark:text-slate-300">Role</Label>
                                <Select
                                    value={form.role}
                                    onValueChange={(value) => setForm({ ...form, role: value })}
                                >
                                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                        <SelectItem value="coach" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">Coach</SelectItem>
                                        <SelectItem value="player" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">Player</SelectItem>
                                    </SelectContent>
                                </Select>
                                {form.role === 'player' && (
                                    <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-[11px] text-blue-300 flex items-start gap-2">
                                        <span className="shrink-0 mt-0.5">ℹ️</span>
                                        <p>
                                            Note: If your coach has already registered you, please use the credentials they provided instead of creating a new account.
                                        </p>
                                    </div>
                                )}
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating account...
                                    </>
                                ) : (
                                    'Create Account'
                                )}
                            </Button>
                        </form>
                        <div className="mt-4 text-center text-slate-500 dark:text-slate-400 text-sm">
                            Already have an account?{' '}
                            <Link href="/login" className="text-green-400 hover:text-green-300 font-medium">
                                Sign in
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}