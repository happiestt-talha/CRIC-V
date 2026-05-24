'use client'

import { CheckCircle2 } from 'lucide-react'

export default function SessionStepper({ currentStep }) {
    const steps = [
        { label: 'Session Info', id: 0 },
        { label: 'Upload Videos', id: 1 },
        { label: 'Analyze', id: 2 }
    ]

    return (
        <div className="flex items-center gap-2 mb-8">
            {steps.map((s, i) => (
                <div key={s.label} className="flex items-center gap-2">
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${i < currentStep
                            ? 'bg-green-600 text-slate-900 dark:text-white'
                            : i === currentStep
                                ? 'bg-green-600/30 text-green-400 border border-green-600'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500'
                        }`}>
                        {i < currentStep ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span className={`text-sm font-medium ${i === currentStep ? 'text-slate-900 dark:text-white' : i < currentStep ? 'text-green-400' : 'text-slate-500 dark:text-slate-500'
                        }`}>{s.label}</span>
                    {i < steps.length - 1 && (
                        <div className={`h-px w-8 mx-1 ${i < currentStep ? 'bg-green-600' : 'bg-slate-700'}`} />
                    )}
                </div>
            ))}
        </div>
    )
}
