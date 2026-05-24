import { useState, useEffect } from 'react'
import { sessionsApi } from '../api/sessions'

export function useSessions(playerId = null) {
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        setLoading(true)
        sessionsApi
            .getSessions(0, 100, playerId)
            .then(setSessions)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [playerId])

    return { sessions, loading, error, setSessions }
}

export function useSession(sessionId) {
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchSession = async () => {
        if (!sessionId) return
        setLoading(true)
        try {
            const data = await sessionsApi.getSession(sessionId)
            setSession(data)
            setError(null)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSession()
    }, [sessionId])

    return { session, loading, error, refresh: fetchSession }
}