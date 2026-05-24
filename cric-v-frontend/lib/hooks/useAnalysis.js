import { useState, useEffect } from 'react'
import { analysisApi } from '../api/analysis'

export function useSessionAnalysis(sessionId) {
    const [analysis, setAnalysis] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!sessionId) return
        setLoading(true)
        analysisApi
            .getSessionAnalysis(sessionId)
            .then(setAnalysis)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [sessionId])

    return { analysis, loading, error }
}

export function useBowlingInsights(playerId) {
    const [insights, setInsights] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!playerId) return
        setLoading(true)
        analysisApi
            .getBowlingInsights(playerId)
            .then(setInsights)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [playerId])

    return { insights, loading, error }
}

export function useBattingInsights(playerId) {
    const [insights, setInsights] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!playerId) return
        setLoading(true)
        analysisApi
            .getBattingInsights(playerId)
            .then(setInsights)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [playerId])

    return { insights, loading, error }
}