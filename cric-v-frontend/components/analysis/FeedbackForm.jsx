'use client'

import { useState } from 'react'
import { analysisApi } from '@/lib/api/analysis'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { formatDateTime } from '@/lib/utils/formatters'
import { Loader2, Star, Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function FeedbackForm({ sessionId, existingFeedback = [], onSuccess }) {
    const { isCoach } = useAuth()

    const [loading, setLoading] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [rating, setRating] = useState(5)
    const [hoverRating, setHoverRating] = useState(0)
    const [comments, setComments] = useState('')
    const [drills, setDrills] = useState([])
    const [drillInput, setDrillInput] = useState('')

    const addDrill = () => {
        if (drillInput.trim()) {
            setDrills([...drills, drillInput.trim()])
            setDrillInput('')
        }
    }

    const removeDrill = (i) => setDrills(drills.filter((_, idx) => idx !== i))

    const handleSubmit = async () => {
        if (!comments.trim()) {
            toast.error('Please add a comment')
            return
        }
        setLoading(true)
        try {
            await analysisApi.createFeedback(sessionId, {
                comments,
                drill_recommendations: drills,
                rating,
            })
            toast.success('Feedback saved!')
            setShowForm(false)
            setComments('')
            setDrills([])
            setRating(5)
            if (onSuccess) onSuccess()
        } catch (err) {
            toast.error('Failed to save feedback', {
                description: err.response?.data?.detail || 'Something went wrong',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            {/* Existing feedback */}
            {existingFeedback.length > 0 && (
                <div className="space-y-3">
                    {existingFeedback.map((fb) => (
                        <Card key={fb.id} className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="text-slate-900 dark:text-white text-sm font-medium">
                                            {fb.coach_name || 'Coach'}
                                        </p>
                                        <p className="text-slate-500 dark:text-slate-500 text-xs">
                                            {formatDateTime(fb.created_at)}
                                        </p>
                                    </div>
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Star
                                                key={s}
                                                className={`h-3.5 w-3.5 ${s <= fb.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-500 dark:text-slate-600'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-slate-500 dark:text-slate-600 dark:text-slate-300 text-sm">{fb.comments}</p>
                                {fb.drill_recommendations?.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-slate-500 dark:text-slate-500 text-xs mb-1.5">Recommended drills:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {fb.drill_recommendations.map((d, i) => (
                                                <Badge
                                                    key={i}
                                                    variant="outline"
                                                    className="text-xs border-green-800 text-green-400"
                                                >
                                                    {d}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {existingFeedback.length === 0 && !showForm && (
                <div className="text-center py-6">
                    <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 text-sm">No feedback yet for this session</p>
                </div>
            )}

            {/* Add feedback button */}
            {isCoach && !showForm && (
                <Button
                    className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    onClick={() => setShowForm(true)}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Feedback
                </Button>
            )}

            {/* Feedback form */}
            {showForm && (
                <Card className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-slate-900 dark:text-white text-sm">Add Your Feedback</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Star rating */}
                        <div>
                            <Label className="text-slate-500 dark:text-slate-600 dark:text-slate-300 text-sm mb-2 block">
                                Session Rating
                            </Label>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setRating(s)}
                                        onMouseEnter={() => setHoverRating(s)}
                                        onMouseLeave={() => setHoverRating(0)}
                                    >
                                        <Star
                                            className={`h-6 w-6 transition-colors ${s <= (hoverRating || rating)
                                                    ? 'text-amber-400 fill-amber-400'
                                                    : 'text-slate-500 dark:text-slate-600'
                                                }`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Comments */}
                        <div>
                            <Label className="text-slate-500 dark:text-slate-600 dark:text-slate-300 text-sm mb-2 block">
                                Comments *
                            </Label>
                            <Textarea
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder="Describe player's performance, areas to improve..."
                                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500 resize-none"
                                rows={4}
                            />
                        </div>

                        {/* Drills */}
                        <div>
                            <Label className="text-slate-500 dark:text-slate-600 dark:text-slate-300 text-sm mb-2 block">
                                Recommended Drills
                            </Label>
                            <div className="flex gap-2 mb-2">
                                <Input
                                    value={drillInput}
                                    onChange={(e) => setDrillInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDrill())}
                                    placeholder="Add a drill..."
                                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500"
                                />
                                <Button
                                    type="button"
                                    onClick={addDrill}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-slate-900 dark:text-white shrink-0"
                                >
                                    Add
                                </Button>
                            </div>
                            {drills.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {drills.map((d, i) => (
                                        <Badge
                                            key={i}
                                            variant="outline"
                                            className="border-green-800 text-green-400 text-xs gap-1"
                                        >
                                            {d}
                                            <button onClick={() => removeDrill(i)}>
                                                <X className="h-2.5 w-2.5" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 pt-1">
                            <Button
                                variant="outline"
                                className="flex-1 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-600 dark:text-slate-300 hover:bg-white dark:bg-slate-900"
                                onClick={() => setShowForm(false)}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-green-600 hover:bg-green-700 text-slate-900 dark:text-white"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                                ) : 'Save Feedback'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}