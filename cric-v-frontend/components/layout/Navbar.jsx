'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/context/ThemeContext'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User, Menu, Sun, Moon } from 'lucide-react'
import { toast } from 'sonner'
import UserAvatar from '@/components/shared/UserAvatar'
import { useSidebar } from '@/lib/hooks/useSidebar'
import { Badge } from '@/components/ui/badge'

export default function Navbar({ title = 'Dashboard' }) {
    const { user, logout } = useAuth()
    const router = useRouter()
    const { openMobile } = useSidebar()
    const { toggleTheme, isDark } = useTheme()

    const handleLogout = async () => {
        try {
            await logout()
            toast.success('Logged out successfully')
        } catch {
            toast.error('Logout failed')
        }
    }

    return (
        <header className="h-16 sticky top-0 z-40 bg-white/90 dark:bg-[#0f172a]/90 border-b border-slate-200 dark:border-slate-800 backdrop-blur flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
                {/* Mobile Menu Button */}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={openMobile}
                    className="lg:hidden text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                    <Menu className="h-6 w-6" />
                </Button>
                
                <h2 className="text-slate-900 dark:text-white font-semibold text-lg truncate max-w-[200px] sm:max-w-none">{title}</h2>
            </div>

            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="w-9 h-9 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    aria-label="Toggle theme"
                >
                    {isDark ? (
                        <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                        <Moon className="w-4 h-4 text-slate-600" />
                    )}
                </Button>

                {/* Role badge */}
                <Badge variant="outline" className="hidden sm:inline-flex bg-green-500/10 border-green-600/30 dark:border-green-500/30 text-green-700 dark:text-green-500 capitalize">
                    {user?.role}
                </Badge>

                {/* User menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="relative h-9 w-9 rounded-full p-0 hover:bg-slate-800"
                        >
                            <UserAvatar user={user} size="sm" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-56 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                        align="end"
                    >
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">
                                    {user?.username}
                                </p>
                                <p className="text-xs leading-none text-slate-400">
                                    {user?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-slate-800" />
                        <DropdownMenuItem
                            className="hover:bg-slate-800 cursor-pointer"
                            onClick={() => router.push('/profile')}
                        >
                            <User className="mr-2 h-4 w-4" />
                            Profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-800" />
                        <DropdownMenuItem
                            className="hover:bg-slate-800 cursor-pointer text-red-400 hover:text-red-300"
                            onClick={handleLogout}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}