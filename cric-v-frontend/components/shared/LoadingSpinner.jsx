import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoadingSpinner({ className, size = 'default', text }) {
    const sizes = {
        sm: 'h-4 w-4',
        default: 'h-8 w-8',
        lg: 'h-12 w-12',
    }

    return (
        <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
            <Loader2 className={cn('animate-spin text-green-500', sizes[size])} />
            {text && <p className="text-slate-500 dark:text-slate-400 text-sm">{text}</p>}
        </div>
    )
}