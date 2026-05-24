import { useState, useEffect } from 'react'
import { usersApi } from '../api/users'
import { useAuth } from './useAuth'

export function usePlayers() {
    const { user } = useAuth()
    const [players, setPlayers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!user) return
        setLoading(true)
        usersApi
            .getPlayersByCoach(user.id)
            .then(setPlayers)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [user])

    return { players, loading, error, setPlayers }
}