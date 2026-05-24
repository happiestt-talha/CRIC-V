'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, ShieldAlert } from 'lucide-react'

export default function ChangePasswordPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (form.new_password !== form.confirm_password) {
            toast.error('New passwords do not match')
            return
        }

        setLoading(true)
        try {
            await authApi.changePassword(form.current_password, form.new_password)
            toast.success('Password changed successfully!', {
                description: 'You can now access the platform.'
            })
            router.push('/dashboard')
        } catch (err) {
            toast.error('Failed to change password', {
                description: err.response?.data?.detail || 'Please check your current password.'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        try {
            await authApi.logout()
            router.push('/login')
        } catch (err) {
            console.error('Logout failed', err)
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
                        <div className="flex items-center gap-2 text-amber-500 mb-2">
                            <ShieldAlert className="h-5 w-5" />
                            <span className="text-sm font-medium">Security Action Required</span>
                        </div>
                        <CardTitle className="text-slate-900 dark:text-white text-xl">Change Password</CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-500 dark:text-slate-400">
                            Your coach has provided a temporary password. For your security, you must change it before continuing.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="current" className="text-slate-500 dark:text-slate-600 dark:text-slate-300">Current Password</Label>
                                <PasswordInput
                                    id="current"
                                    value={form.current_password}
                                    onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                                    required
                                    className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new" className="text-slate-500 dark:text-slate-600 dark:text-slate-300">New Password</Label>
                                <PasswordInput
                                    id="new"
                                    placeholder="Min 8 characters"
                                    value={form.new_password}
                                    onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                                    required
                                    minLength={8}
                                    className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm" className="text-slate-500 dark:text-slate-600 dark:text-slate-300">Confirm New Password</Label>
                                <PasswordInput
                                    id="confirm"
                                    value={form.confirm_password}
                                    onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                                    required
                                    className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
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
                                        Updating...
                                    </>
                                ) : (
                                    'Update Password'
                                )}
                            </Button>
                        </form>
                        
                        <div className="mt-6 text-center">
                            <button 
                                onClick={handleLogout}
                                className="text-sm text-slate-500 dark:text-slate-500 dark:text-slate-400 hover:text-white transition-colors"
                            >
                                Logout and try again later
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
