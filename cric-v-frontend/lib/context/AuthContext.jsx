'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { authApi } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const token = Cookies.get('access_token')
        if (token) {
            authApi
                .getMe()
                .then((userData) => {
                    setUser(userData)
                    if (userData.must_change_password) {
                        router.push('/change-password')
                    }
                })
                .catch(() => {
                    Cookies.remove('access_token')
                    setUser(null)
                })
                .finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [])

    const login = async (username, password) => {
        const data = await authApi.login(username, password)
        const userData = await authApi.getMe()
        setUser(userData)
        
        if (data.must_change_password) {
            router.push('/change-password')
        } else {
            router.push('/dashboard')
        }
    }

    const register = async (userData) => {
        await authApi.register(userData)
        router.push('/login')
    }

    const logout = async () => {
        await authApi.logout()
        setUser(null)
        router.push('/login')
    }

    const isAdmin = user?.role === 'admin'
    const isCoach = user?.role === 'coach' || user?.role === 'admin'

    const updateUser = (updatedFields) => {
        setUser(prev => ({
            ...prev,
            ...updatedFields
        }))
    }

    return (
        <AuthContext.Provider
            value={{ user, loading, login, register, logout, isAdmin, isCoach, updateUser }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within AuthProvider')
    return context
}