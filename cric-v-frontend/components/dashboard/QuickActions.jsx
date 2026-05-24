import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Upload, Users, BarChart3 } from 'lucide-react'

const actions = [
    {
        label: 'New Session',
        description: 'Create a training session',
        href: '/sessions/new',
        icon: Plus,
        color: 'bg-green-600 hover:bg-green-700',
    },
    {
        label: 'Add Player',
        description: 'Register a new player',
        href: '/players/new',
        icon: Users,
        color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
        label: 'View Sessions',
        description: 'Browse all sessions',
        href: '/sessions',
        icon: BarChart3,
        color: 'bg-purple-600 hover:bg-purple-700',
    },
]

export default function QuickActions() {
    return (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3">
                {actions.map((action) => {
                    const Icon = action.icon
                    return (
                        <Link key={action.href} href={action.href}>
                            <Button
                                className={`w-full justify-start gap-3 text-white ${action.color}`}
                            >
                                <Icon className="h-4 w-4" />
                                <div className="text-left">
                                    <p className="text-sm font-medium">{action.label}</p>
                                </div>
                            </Button>
                        </Link>
                    )
                })}
            </CardContent>
        </Card>
    )
}