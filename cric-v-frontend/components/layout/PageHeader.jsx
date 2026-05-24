import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PageHeader({
    title,
    description,
    backHref,
    backLabel = 'Back',
    action,
}) {
    return (
        <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
                {backHref && (
                    <Link href={backHref}>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 mt-0.5"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            {backLabel}
                        </Button>
                    </Link>
                )}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
                    {description && (
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{description}</p>
                    )}
                </div>
            </div>
            {action && <div>{action}</div>}
        </div>
    )
}