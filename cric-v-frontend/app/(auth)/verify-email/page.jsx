'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

function VerifyEmailContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')
    
    const [status, setStatus] = useState('verifying') // verifying, success, error

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus('error')
                return
            }

            try {
                await authApi.verifyEmail(token)
                setStatus('success')
                toast.success('Email verified!', { description: 'Your account is now fully active.' })
            } catch (err) {
                setStatus('error')
                toast.error('Verification failed', {
                    description: err.response?.data?.detail || 'Invalid or expired token.'
                })
            }
        }

        verify()
    }, [token])

    return (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="text-center">
                <CardTitle className="text-slate-900 dark:text-white text-xl">
                    {status === 'verifying' && 'Verifying Email...'}
                    {status === 'success' && 'Verification Complete'}
                    {status === 'error' && 'Verification Failed'}
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-500 dark:text-slate-400">
                    {status === 'verifying' && 'Please wait while we verify your account.'}
                    {status === 'success' && 'Your email has been verified. You can now access all features.'}
                    {status === 'error' && 'We could not verify your email address.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-6">
                <div className="flex justify-center mb-6">
                    {status === 'verifying' && <Loader2 className="h-12 w-12 animate-spin text-green-500" />}
                    {status === 'success' && <CheckCircle2 className="h-12 w-12 text-green-500" />}
                    {status === 'error' && <XCircle className="h-12 w-12 text-red-500" />}
                </div>

                <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-slate-900 dark:text-white">
                    <Link href={status === 'success' ? '/dashboard' : '/login'}>
                        {status === 'success' ? 'Go to Dashboard' : 'Back to Login'}
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
}

export default function VerifyEmailPage() {
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
                    <VerifyEmailContent />
                </Suspense>
            </div>
        </div>
    )
}
