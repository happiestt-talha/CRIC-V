import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { User, ArrowRight } from 'lucide-react'

export default function PlayerCard({ player }) {
    return (
        <Card className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-green-700 transition-colors shadow-sm">
            <CardContent className="p-5">
                <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-600/20 text-green-700 dark:text-green-400 text-xl font-bold shrink-0">
                        {player.full_name?.charAt(0)?.toUpperCase() || <User />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-slate-900 dark:text-white font-semibold truncate">
                            {player.full_name}
                        </h3>
                        {player.age && (
                            <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm">Age: {player.age}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                            {player.batting_hand && (
                                <Badge
                                    variant="outline"
                                    className="text-xs border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-500 dark:text-slate-400 capitalize"
                                >
                                    {player.batting_hand} hand
                                </Badge>
                            )}
                            {player.bowling_style && (
                                <Badge
                                    variant="outline"
                                    className="text-xs border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-500 dark:text-slate-400"
                                >
                                    {player.bowling_style?.replace(/_/g, ' ')}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-4">
                    <Link href={`/players/${player.id}`}>
                        <Button
                            size="sm"
                            className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700"
                        >
                            View Profile
                            <ArrowRight className="ml-2 h-3 w-3" />
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}