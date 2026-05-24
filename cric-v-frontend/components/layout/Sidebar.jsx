'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSidebar } from '@/lib/hooks/useSidebar'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    Users,
    Video,
    BarChart2,
    UserCircle,
    ChevronLeft,
    ChevronRight,
    X,
    LogOut
} from 'lucide-react'
import UserAvatar from '@/components/shared/UserAvatar'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Players', href: '/players', icon: Users },
    { label: 'Sessions', href: '/sessions', icon: Video },
    { label: 'Analysis', href: '/analysis', icon: BarChart2 },
    // { label: 'Profile', href: '/profile', icon: UserCircle },
]

export default function Sidebar() {
    const pathname = usePathname()
    const { user } = useAuth()
    const { isCollapsed, isMobileOpen, closeMobile, toggle } = useSidebar()
    const [isHovered, setIsHovered] = useState(false)

    // Sidebar is visually collapsed only if pinned AND not hovered
    const effectiveCollapsed = isCollapsed && !isHovered

    const NavItem = ({ item }) => {
        const Icon = item.icon
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

        const content = (
            <Link
                href={item.href}
                onClick={() => { if (isMobileOpen) closeMobile() }}
                className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative',
                    isActive
                        ? 'bg-green-500/10 text-green-600 dark:text-green-500 border-l-2 border-green-500 rounded-l-none'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
            >
                <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-green-500")} />
                {!effectiveCollapsed && <span className="flex-1 truncate">{item.label}</span>}
            </Link>
        )

        if (effectiveCollapsed) {
            return (
                <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {content}
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-slate-800 border-slate-700 text-white">
                            {item.label}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        }

        return content
    }

    return (
        <>
            {/* Mobile Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
                    onClick={closeMobile}
                />
            )}

            {/* Sidebar Container */}
            <aside
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={cn(
                    "fixed left-0 top-0 h-full bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 z-50 flex flex-col transition-all duration-300 ease-in-out",
                    // Desktop width
                    effectiveCollapsed ? "w-16" : "w-[280px] shadow-2xl",
                    // Mobile behavior
                    "max-lg:w-[280px] max-lg:fixed",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Header / Logo */}
                <div className={cn(
                    "flex items-center h-16 px-4 border-b border-slate-200 dark:border-slate-800",
                    effectiveCollapsed ? "justify-center" : "justify-between"
                )}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-600 shrink-0">
                            <span className="text-lg">🏏</span>
                        </div>
                        {!effectiveCollapsed && (
                            <div className="transition-opacity duration-200">
                                <h1 className="text-slate-900 dark:text-white font-bold text-lg leading-none">CRIC-V</h1>
                                <p className="text-slate-500 dark:text-slate-500 text-[10px] mt-0.5 uppercase tracking-wider">Coaching Assistant</p>
                            </div>
                        )}
                    </div>

                    {/* Desktop Toggle Button */}
                    {!effectiveCollapsed && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggle}
                            className="hidden lg:flex h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-300"
                        >
                            {isCollapsed ? (
                                <ChevronRight className="h-5 w-5" />
                            ) : (
                                <ChevronLeft className="h-5 w-5" />
                            )}
                        </Button>
                    )}

                    {/* Mobile Close Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={closeMobile}
                        className="lg:hidden h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
                    {navItems.map((item) => (
                        <NavItem key={item.href} item={item} />
                    ))}
                </nav>

                {/* Bottom User Section */}
                <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <Link
                        href="/profile"
                        onClick={() => { if (isMobileOpen) closeMobile() }}
                        className={cn(
                            "flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 group",
                            effectiveCollapsed ? "justify-center" : ""
                        )}
                    >
                        <UserAvatar user={user} size={effectiveCollapsed ? "sm" : "md"} className="shrink-0" />
                        {!effectiveCollapsed && (
                            <div className="flex-1 min-w-0 overflow-hidden text-left">
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{user?.username || 'User'}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-500 capitalize truncate">{user?.role}</p>
                            </div>
                        )}
                    </Link>
                </div>
            </aside>
        </>
    )
}