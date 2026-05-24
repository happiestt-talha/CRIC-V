'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import Navbar from '@/components/layout/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import UserAvatar from '@/components/shared/UserAvatar'
import { authApi } from '@/lib/api/auth'
import { toast } from 'sonner'
import { Check, X, Camera, Edit2, Shield, Calendar, Fingerprint, Eye, EyeOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProfilePage() {
    const { user, updateUser, logout } = useAuth()
    
    // Avatar State
    const [avatarFile, setAvatarFile] = useState(null)
    const [avatarPreview, setAvatarPreview] = useState(null)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const fileInputRef = useRef(null)

    // Profile Info State
    const [isEditing, setIsEditing] = useState(false)
    const [profileForm, setProfileForm] = useState({
        username: user?.username || '',
        email: user?.email || '',
        full_name: user?.full_name || ''
    })
    const [savingProfile, setSavingProfile] = useState(false)

    // Password State
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    })
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    })
    const [changingPassword, setChangingPassword] = useState(false)

    useEffect(() => {
        if (user) {
            setProfileForm({
                username: user.username || '',
                email: user.email || '',
                full_name: user.full_name || ''
            })
        }
    }, [user])

    // Password validations
    const passwordRequirements = {
        length: passwords.new.length >= 8,
        number: /\d/.test(passwords.new),
        letter: /[a-zA-Z]/.test(passwords.new),
        match: passwords.new === passwords.confirm && passwords.new !== ''
    }

    const isPasswordValid = passwordRequirements.length && passwordRequirements.number && passwordRequirements.letter && passwordRequirements.match

    // Avatar Handlers
    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (!file) return

        if (file.size > 2 * 1024 * 1024) {
            toast.error('File too large. Max 2MB allowed.')
            return
        }

        setAvatarFile(file)
        setAvatarPreview(URL.createObjectURL(file))
    }

    const handleSaveAvatar = async () => {
        if (!avatarFile) return
        setUploadingAvatar(true)
        try {
            const formData = new FormData()
            formData.append('avatar', avatarFile)
            const res = await authApi.uploadAvatar(formData)
            updateUser({ avatar_url: res.avatar_url })
            toast.success('Avatar updated successfully')
            setAvatarFile(null)
            setAvatarPreview(null)
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to upload avatar')
        } finally {
            setUploadingAvatar(false)
        }
    }

    // Profile Handlers
    const handleProfileSubmit = async (e) => {
        e.preventDefault()
        setSavingProfile(true)
        const emailChanged = profileForm.email !== user.email
        
        try {
            const updatedUser = await authApi.updateProfile(profileForm)
            updateUser(updatedUser)
            toast.success('Profile updated successfully')
            setIsEditing(false)
            
            if (emailChanged) {
                toast.info('Email changed. You will be logged out to verify your new email.')
                setTimeout(() => logout(), 2000)
            }
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update profile')
        } finally {
            setSavingProfile(false)
        }
    }

    // Password Handlers
    const handleChangePassword = async (e) => {
        e.preventDefault()
        setChangingPassword(true)
        try {
            await authApi.changePassword(passwords.current, passwords.new)
            toast.success('Password changed successfully')
            setPasswords({ current: '', new: '', confirm: '' })
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to change password')
        } finally {
            setChangingPassword(false)
        }
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-100 dark:bg-[#0f172a]">
            <Navbar title="User Profile" />
            
            <div className="flex-1 p-4 lg:p-8 max-w-4xl mx-auto w-full space-y-8 pb-12">
                
                {/* Section 1: Avatar Card */}
                <Card className="bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-800">
                    <CardContent className="pt-10 pb-8 flex flex-col items-center">
                        <div className="relative group">
                            <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-green-500/50">
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
                                ) : (
                                    <UserAvatar user={user} size="lg" className="h-full w-full" />
                                )}
                            </div>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 p-1.5 bg-green-600 rounded-full text-slate-900 dark:text-white hover:bg-green-500 transition-colors shadow-lg"
                            >
                                <Camera className="h-4 w-4" />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/jpeg,image/png,image/webp" 
                                onChange={handleFileSelect}
                            />
                        </div>
                        
                        <div className="mt-4 text-center">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{user?.username}</h3>
                            <Badge variant="outline" className="mt-1 bg-green-500/10 text-green-500 border-green-500/20 capitalize">
                                {user?.role}
                            </Badge>
                        </div>

                        {avatarPreview && (
                            <div className="mt-6 flex gap-2">
                                <Button 
                                    size="sm" 
                                    className="bg-green-600 hover:bg-green-500" 
                                    onClick={handleSaveAvatar}
                                    disabled={uploadingAvatar}
                                >
                                    {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                    Save Avatar
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-600 dark:text-slate-300"
                                    onClick={() => {
                                        setAvatarPreview(null)
                                        setAvatarFile(null)
                                    }}
                                    disabled={uploadingAvatar}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Section 2: Profile Information */}
                <Card className="bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-800 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-slate-800">
                        <div>
                            <CardTitle className="text-lg text-slate-900 dark:text-white">Profile Information</CardTitle>
                            <CardDescription className="text-slate-500 dark:text-slate-500 dark:text-slate-400">Update your account details</CardDescription>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-slate-500 dark:text-slate-500 dark:text-slate-400 hover:text-white"
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            {isEditing ? <X className="h-4 w-4 mr-2" /> : <Edit2 className="h-4 w-4 mr-2" />}
                            {isEditing ? 'Cancel' : 'Edit'}
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-500 dark:text-slate-600 dark:text-slate-300">Username</Label>
                                    {isEditing ? (
                                        <Input 
                                            value={profileForm.username} 
                                            onChange={e => setProfileForm({...profileForm, username: e.target.value})}
                                            className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                        />
                                    ) : (
                                        <p className="p-2 bg-white dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">{user?.username}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-500 dark:text-slate-600 dark:text-slate-300">Email Address</Label>
                                    {isEditing ? (
                                        <div className="space-y-2">
                                            <Input 
                                                type="email"
                                                value={profileForm.email} 
                                                onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                                                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                            />
                                            {profileForm.email !== user?.email && (
                                                <div className="text-[10px] text-amber-400 bg-amber-400/10 p-2 rounded border border-amber-400/20">
                                                    Changing your email will require re-verification. You will be logged out.
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="p-2 bg-white dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">{user?.email}</p>
                                    )}
                                </div>
                                {user?.role === 'player' && (
                                    <div className="space-y-2 md:col-span-2">
                                        <Label className="text-slate-500 dark:text-slate-600 dark:text-slate-300">Full Name</Label>
                                        {isEditing ? (
                                            <Input 
                                                value={profileForm.full_name} 
                                                onChange={e => setProfileForm({...profileForm, full_name: e.target.value})}
                                                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                            />
                                        ) : (
                                            <p className="p-2 bg-white dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">{user?.full_name || 'Not set'}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {isEditing && (
                                <div className="pt-4 flex justify-end">
                                    <Button 
                                        type="submit" 
                                        className="bg-green-600 hover:bg-green-500"
                                        disabled={savingProfile}
                                    >
                                        {savingProfile && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                        Save Changes
                                    </Button>
                                </div>
                            )}
                        </form>
                    </CardContent>
                </Card>

                {/* Section 3: Change Password */}
                <Card className="bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-800">
                    <CardHeader className="border-b border-slate-200 dark:border-slate-800">
                        <CardTitle className="text-lg text-slate-900 dark:text-white">Security</CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-500 dark:text-slate-400">Change your password</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-slate-500 dark:text-slate-600 dark:text-slate-300">Current Password</Label>
                                <div className="relative">
                                    <Input 
                                        type={showPasswords.current ? "text" : "password"} 
                                        value={passwords.current}
                                        onChange={e => setPasswords({...passwords, current: e.target.value})}
                                        className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white pr-10"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500"
                                    >
                                        {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-500 dark:text-slate-600 dark:text-slate-300">New Password</Label>
                                    <div className="relative">
                                        <Input 
                                            type={showPasswords.new ? "text" : "password"} 
                                            value={passwords.new}
                                            onChange={e => setPasswords({...passwords, new: e.target.value})}
                                            className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white pr-10"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500"
                                        >
                                            {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-500 dark:text-slate-600 dark:text-slate-300">Confirm New Password</Label>
                                    <div className="relative">
                                        <Input 
                                            type={showPasswords.confirm ? "text" : "password"} 
                                            value={passwords.confirm}
                                            onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                                            className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white pr-10"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500"
                                        >
                                            {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Requirements Checklist */}
                            <div className="p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                                <div className="flex items-center gap-2 text-xs">
                                    {passwordRequirements.length ? <Check className="h-3 w-3 text-green-500" /> : <div className="h-3 w-3 rounded-full border border-slate-600" />}
                                    <span className={passwordRequirements.length ? "text-green-500" : "text-slate-500 dark:text-slate-500"}>At least 8 characters</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    {passwordRequirements.number ? <Check className="h-3 w-3 text-green-500" /> : <div className="h-3 w-3 rounded-full border border-slate-600" />}
                                    <span className={passwordRequirements.number ? "text-green-500" : "text-slate-500 dark:text-slate-500"}>Contains a number</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    {passwordRequirements.letter ? <Check className="h-3 w-3 text-green-500" /> : <div className="h-3 w-3 rounded-full border border-slate-600" />}
                                    <span className={passwordRequirements.letter ? "text-green-500" : "text-slate-500 dark:text-slate-500"}>Contains a letter</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    {passwordRequirements.match ? <Check className="h-3 w-3 text-green-500" /> : <div className="h-3 w-3 rounded-full border border-slate-600" />}
                                    <span className={passwordRequirements.match ? "text-green-500" : "text-slate-500 dark:text-slate-500"}>Passwords match</span>
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button 
                                    type="submit" 
                                    className="w-full bg-green-600 hover:bg-green-500"
                                    disabled={!isPasswordValid || changingPassword}
                                >
                                    {changingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Change Password
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Section 4: Account Information */}
                <Card className="bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-800">
                    <CardHeader className="border-b border-slate-200 dark:border-slate-800">
                        <CardTitle className="text-lg text-slate-900 dark:text-white">Account Details</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-start gap-3">
                            <Fingerprint className="h-5 w-5 text-slate-500 dark:text-slate-500 mt-0.5" />
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wider">Account ID</p>
                                <p className="text-sm text-slate-900 dark:text-white font-mono">{user?.id}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Shield className="h-5 w-5 text-slate-500 dark:text-slate-500 mt-0.5" />
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wider">Role</p>
                                <p className="text-sm text-slate-900 dark:text-white capitalize">{user?.role}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Calendar className="h-5 w-5 text-slate-500 dark:text-slate-500 mt-0.5" />
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wider">Member Since</p>
                                <p className="text-sm text-slate-900 dark:text-white">
                                    {user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Activity className="h-5 w-5 text-slate-500 dark:text-slate-500 mt-0.5" />
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wider">Status</p>
                                <div className="mt-1">
                                    {user?.email_verified ? (
                                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Verified</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-amber-500 border-amber-500/20">Unverified</Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}

function Activity(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    )
}
