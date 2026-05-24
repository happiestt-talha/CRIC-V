'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { authApi } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
    const { login } = useAuth()
    const [loading, setLoading] = useState(false)
    const [resending, setResending] = useState(false)
    const [form, setForm] = useState({ username: '', password: '' })
    const [isUnverified, setIsUnverified] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setIsUnverified(false)
        try {
            await login(form.username, form.password)
            toast.success('Welcome back!', { description: 'Logged in successfully.' })
        } catch (err) {
            const detail = err.response?.data?.detail || ''
            if (err.response?.status === 403 && detail.toLowerCase().includes('verify your email')) {
                setIsUnverified(true)
                toast.error('Account not verified', { description: detail })
            } else {
                toast.error('Login failed', {
                    description: detail || 'Invalid credentials'
                })
            }
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        // If username is an email, use it. Otherwise, we might need the user to provide it.
        // For simplicity, we'll try to use the username if it contains '@'
        const email = form.username.includes('@') ? form.username : null
        
        if (!email) {
            toast.error('Email not detected', { description: 'Please enter your email in the username field to resend verification.' })
            return
        }

        setResending(true)
        try {
            await authApi.resendVerification(email)
            toast.success('Verification email resent!')
        } catch (err) {
            toast.error('Failed to resend', {
                description: err.response?.data?.detail || 'Please try again later.'
            })
        } finally {
            setResending(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-200 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-600 mb-4">
                        <span className="text-2xl">🏏</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">CRIC-V</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Cricket Coaching Assistant</p>
                </div>

                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-slate-900 dark:text-white text-xl">Sign In</CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-400">
                            Enter your credentials to access the platform
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isUnverified && (
                            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                <div className="space-y-2">
                                    <p className="text-sm text-red-200">
                                        Your email is not verified. Please check your inbox for the verification link.
                                    </p>
                                    <button 
                                        onClick={handleResend}
                                        disabled={resending}
                                        className="text-sm text-green-400 hover:text-green-300 font-medium disabled:opacity-50"
                                    >
                                        {resending ? 'Resending...' : 'Resend verification email'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-slate-700 dark:text-slate-300">
                                    Username or Email
                                </Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="your@email.com"
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    required
                                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                                    Password
                                </Label>
                                <PasswordInput
                                    id="password"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required
                                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                                <div className="flex justify-end">
                                    <Link 
                                        href="/forgot-password" 
                                        className="text-xs text-green-400 hover:text-green-300 font-medium"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </form>
                        <div className="mt-4 text-center text-slate-500 dark:text-slate-400 text-sm">
                            Don&apos;t have an account?{' '}
                            <Link href="/register" className="text-green-400 hover:text-green-300 font-medium">
                                Register here
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}