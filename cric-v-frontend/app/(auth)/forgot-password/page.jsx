'use client'

import { useState } from 'react'
import Link from 'next/link'
import { authApi } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await authApi.forgotPassword(email)
            setSubmitted(true)
            toast.success('Reset link sent!', { 
                description: 'If this email is registered, a reset link has been sent to your inbox.' 
            })
        } catch (err) {
            toast.error('Request failed', {
                description: err.response?.data?.detail || 'Something went wrong. Please try again.'
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
                </div>

                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-slate-900 dark:text-white text-xl">Forgot Password</CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-500 dark:text-slate-400">
                            {submitted 
                                ? "If this email is registered, a reset link has been sent to your inbox."
                                : "Enter your email address and we'll send you a link to reset your password."
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!submitted ? (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-500 dark:text-slate-600 dark:text-slate-300">
                                        Email Address
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="your@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
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
                                            Sending...
                                        </>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </Button>
                            </form>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-slate-500 dark:text-slate-600 dark:text-slate-300 mb-6">
                                    Didn&apos;t receive the email? Check your spam folder or try again.
                                </p>
                                <Button 
                                    variant="outline" 
                                    className="border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800"
                                    onClick={() => setSubmitted(false)}
                                >
                                    Try another email
                                </Button>
                            </div>
                        )}
                        
                        <div className="mt-6 text-center">
                            <Link href="/login" className="inline-flex items-center text-sm text-green-400 hover:text-green-300 font-medium">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Login
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
