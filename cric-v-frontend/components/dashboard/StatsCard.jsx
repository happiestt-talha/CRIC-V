import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function StatsCard({
    title,
    value,
    subtitle,
    icon: Icon,
    iconColor = 'text-green-400',
    iconBg = 'bg-green-600/20',
    trend,
}) {
    return (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                            {value ?? '—'}
                        </p>
                        {subtitle && (
                            <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">{subtitle}</p>
                        )}
                        {trend && (
                            <p
                                className={cn(
                                    'text-xs mt-2 font-medium',
                                    trend.positive ? 'text-green-400' : 'text-red-400'
                                )}
                            >
                                {trend.positive ? '↑' : '↓'} {trend.label}
                            </p>
                        )}
                    </div>
                    {Icon && (
                        <div className={cn('p-3 rounded-xl', iconBg)}>
                            <Icon className={cn('h-5 w-5', iconColor)} />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}