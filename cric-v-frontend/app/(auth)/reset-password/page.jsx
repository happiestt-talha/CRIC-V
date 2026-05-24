'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')
    
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const [form, setForm] = useState({ password: '', confirmPassword: '' })

    useEffect(() => {
        if (!token) {
            setError('No reset token found in URL.')
        }
    }, [token])

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (form.password !== form.confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        setLoading(true)
        setError('')
        try {
            await authApi.resetPassword(token, form.password)
            setSuccess(true)
            toast.success('Password reset successfully!', { 
                description: 'Password reset successfully. Please log in.' 
            })
            setTimeout(() => router.push('/login'), 3000)
        } catch (err) {
            const detail = err.response?.data?.detail || 'Invalid or expired token.'
            setError(detail)
            toast.error('Reset failed', { description: detail })
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardContent className="pt-6 text-center">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
                    <CardTitle className="text-slate-900 dark:text-white text-xl mb-2">Success!</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-500 dark:text-slate-400 mb-6">
                        Password reset successfully. Please log in. Redirecting...
                    </CardDescription>
                    <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-slate-900 dark:text-white">
                        <Link href="/login">Go to Login</Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardContent className="pt-6 text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                    <CardTitle className="text-slate-900 dark:text-white text-xl mb-2">Link Invalid</CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-500 dark:text-slate-400 mb-6">
                        {error}
                    </CardDescription>
                    <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-slate-900 dark:text-white">
                        <Link href="/forgot-password">Request New Link</Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white text-xl">Reset Password</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-500 dark:text-slate-400">
                    Enter your new password below.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-slate-500 dark:text-slate-600 dark:text-slate-300">
                            New Password
                        </Label>
                        <PasswordInput
                            id="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                            minLength={8}
                            className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-slate-500 dark:text-slate-600 dark:text-slate-300">
                            Confirm Password
                        </Label>
                        <PasswordInput
                            id="confirmPassword"
                            placeholder="••••••••"
                            value={form.confirmPassword}
                            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                            required
                            className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500"
                        />
                    </div>
                    <Button
                        type="submit"
                        className="w-full bg-green-600 hover:bg-green-700 text-slate-900 dark:text-white"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Resetting...
                            </>
                        ) : (
                            'Reset Password'
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-slate-200 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-600 mb-4">
                        <span className="text-2xl">🏏</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">CRIC-V</h1>
                </div>

                <Suspense fallback={
                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <CardContent className="pt-6 flex justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                        </CardContent>
                    </Card>
                }>
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </div>
    )
}
