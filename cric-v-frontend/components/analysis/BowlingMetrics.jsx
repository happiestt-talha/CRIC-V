import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    formatSpeed,
    formatAngle,
    formatPercentage,
} from '@/lib/utils/formatters'
import { CheckCircle2, XCircle, Zap, Target, RotateCcw } from 'lucide-react'

export default function BowlingMetrics({ metrics }) {
    if (!metrics) {
        return (
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardContent className="py-10 text-center">
                    <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm">No bowling data available</p>
                </CardContent>
            </Card>
        )
    }

    const iccCompliant = metrics.icc_compliant

    return (
        <div className="space-y-4">
            {/* Key metrics row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    {
                        label: 'Elbow Extension',
                        value: formatAngle(metrics.elbow_extension),
                        icon: RotateCcw,
                        color: 'text-blue-400',
                    },
                    {
                        label: 'Arm Type',
                        value: metrics.arm_type?.replace(/_/g, ' ') || 'N/A',
                        icon: Target,
                        color: 'text-purple-400',
                    },
                    {
                        label: 'Swing Type',
                        value: metrics.swing_type || 'N/A',
                        icon: Zap,
                        color: 'text-amber-400',
                    },
                    {
                        label: 'ICC Compliant',
                        value: iccCompliant ? 'Legal' : 'Illegal',
                        icon: iccCompliant ? CheckCircle2 : XCircle,
                        color: iccCompliant ? 'text-green-400' : 'text-red-400',
                    },
                ].map((item) => {
                    const Icon = item.icon
                    return (
                        <Card key={item.label} className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                            <CardContent className="p-4 text-center">
                                <Icon className={`h-5 w-5 mx-auto mb-2 ${item.color}`} />
                                <p className={`font-bold text-sm ${item.color}`}>
                                    {item.value}
                                </p>
                                <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">{item.label}</p>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Release point */}
            {metrics.release_point && (
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-900 dark:text-white text-sm">Release Point</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-3">
                            {Object.entries(metrics.release_point).map(([axis, val]) => (
                                <div key={axis} className="text-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                    <p className="text-green-400 font-bold text-sm">
                                        {Number(val).toFixed(2)}
                                    </p>
                                    <p className="text-slate-500 dark:text-slate-500 text-xs mt-1 uppercase">{axis}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Front foot landing */}
            {metrics.front_foot_landing && (
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-900 dark:text-white text-sm">Front Foot Landing</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-3">
                            {Object.entries(metrics.front_foot_landing).map(([key, val]) => (
                                <div key={key} className="text-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                    <p className="text-slate-900 dark:text-white font-bold text-sm">
                                        {typeof val === 'boolean'
                                            ? val ? '✅ Legal' : '❌ Illegal'
                                            : Number(val).toFixed(2)}
                                    </p>
                                    <p className="text-slate-500 dark:text-slate-500 text-xs mt-1 capitalize">{key}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recommendations */}
            {metrics.recommendations?.length > 0 && (
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-900 dark:text-white text-sm">
                            💡 Recommendations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {metrics.recommendations.map((rec, i) => (
                                <li
                                    key={i}
                                    className="flex items-start gap-2 text-slate-500 dark:text-slate-600 dark:text-slate-300 text-sm"
                                >
                                    <span className="text-green-400 mt-0.5 shrink-0">→</span>
                                    {rec}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}