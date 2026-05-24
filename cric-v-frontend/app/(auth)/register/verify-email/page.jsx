'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'

function VerifyEmailMessage() {
    const searchParams = useSearchParams()
    const email = searchParams.get('email')
    const [loading, setLoading] = useState(false)
    const [countdown, setCountdown] = useState(0)

    const handleResend = async () => {
        if (!email) {
            toast.error('Email not found', { description: 'Please try logging in to resend verification.' })
            return
        }

        setLoading(true)
        try {
            await authApi.resendVerification(email)
            toast.success('Verification email sent!')
            setCountdown(60)
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        } catch (err) {
            toast.error('Failed to resend', {
                description: err.response?.data?.detail || 'Please try again later.'
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                    <div className="p-3 bg-green-500/10 rounded-full">
                        <Mail className="h-8 w-8 text-green-500" />
                    </div>
                </div>
                <CardTitle className="text-slate-900 dark:text-white text-xl">Check your inbox</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-500 dark:text-slate-400">
                    We&apos;ve sent a verification email to <span className="text-slate-900 dark:text-white font-medium">{email || 'your email'}</span>. 
                    Please check your inbox and click the link to activate your account.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-slate-900 dark:text-white"
                    onClick={handleResend}
                    disabled={loading || countdown > 0}
                >
                    {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Email'}
                </Button>
                
                <div className="text-center">
                    <Link href="/login" className="inline-flex items-center text-sm text-slate-500 dark:text-slate-500 dark:text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Login
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}

export default function RegisterVerifyEmailPage() {
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
                    <VerifyEmailMessage />
                </Suspense>
            </div>
        </div>
    )
}
