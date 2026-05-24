'use client'

import ProtectedRoute from '@/components/shared/ProtectedRoute'
import Sidebar from '@/components/layout/Sidebar'
import { useSidebar } from '@/lib/hooks/useSidebar'
import { cn } from '@/lib/utils'

export default function DashboardLayout({ children }) {
    const { isCollapsed } = useSidebar()

    return (
        <ProtectedRoute>
            <div className="flex min-h-screen bg-slate-100 dark:bg-[#0f172a] text-slate-900 dark:text-slate-50">
                <Sidebar />
                <main 
                    className={cn(
                        "flex-1 flex flex-col min-h-screen transition-all duration-200 ease-in-out",
                        // Desktop margin based on sidebar state
                        isCollapsed ? "lg:ml-16" : "lg:ml-[280px]",
                        // On mobile, sidebar is an overlay, so no margin
                        "ml-0"
                    )}
                >
                    {children}
                </main>
            </div>
        </ProtectedRoute>
    )
}