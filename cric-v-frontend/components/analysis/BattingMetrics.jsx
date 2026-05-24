import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatAngle, formatScore } from '@/lib/utils/formatters'

export default function BattingMetrics({ metrics }) {
    if (!metrics) {
        return (
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <CardContent className="py-10 text-center">
                    <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm">No batting data available</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                    {
                        label: 'Stance Type',
                        value: metrics.stance_type || 'N/A',
                        color: 'text-blue-400',
                    },
                    {
                        label: 'Bat Angle',
                        value: formatAngle(metrics.bat_angle),
                        color: 'text-amber-400',
                    },
                ].map((item) => (
                    <Card key={item.label} className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                        <CardContent className="p-4 text-center">
                            <p className={`font-bold text-sm ${item.color}`}>{item.value}</p>
                            <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">{item.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Weight distribution */}
            {metrics.weight_distribution && (
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-900 dark:text-white text-sm">
                            Weight Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(metrics.weight_distribution).map(([key, val]) => (
                                <div
                                    key={key}
                                    className="text-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg"
                                >
                                    <p className="text-green-400 font-bold">
                                        {typeof val === 'number' ? `${Math.round(val)}%` : val}
                                    </p>
                                    <p className="text-slate-500 dark:text-slate-500 text-xs mt-1 capitalize">
                                        {key.replace(/_/g, ' ')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Head position */}
            {metrics.head_position && (
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-900 dark:text-white text-sm">Head Position</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {Object.entries(metrics.head_position).map(([key, val]) => (
                                <div
                                    key={key}
                                    className="text-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg"
                                >
                                    <p className="text-slate-900 dark:text-white font-bold text-sm">
                                        {typeof val === 'boolean'
                                            ? val ? '✅ Yes' : '❌ No'
                                            : typeof val === 'number'
                                                ? Number(val).toFixed(2)
                                                : String(val)}
                                    </p>
                                    <p className="text-slate-500 dark:text-slate-500 text-xs mt-1 capitalize">
                                        {key.replace(/_/g, ' ')}
                                    </p>
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