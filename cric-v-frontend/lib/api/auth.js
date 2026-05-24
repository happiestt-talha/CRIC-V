import axiosInstance from './axios'
import Cookies from 'js-cookie'

export const authApi = {
    async login(username, password) {
        const formData = new URLSearchParams()
        formData.append('username', username)
        formData.append('password', password)

        const response = await axiosInstance.post('/auth/login', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })

        const { access_token } = response.data
        Cookies.set('access_token', access_token, { expires: 1 })

        return response.data
    },

    async register(userData) {
        const response = await axiosInstance.post('/auth/register', userData)
        return response.data
    },

    async logout() {
        try {
            await axiosInstance.post('/auth/logout')
        } finally {
            Cookies.remove('access_token')
            Cookies.remove('refresh_token')
        }
    },

    async getMe() {
        const response = await axiosInstance.get('/auth/me')
        return response.data
    },

    async verifyToken() {
        const response = await axiosInstance.get('/auth/verify')
        return response.data
    },

    async changePassword(currentPassword, newPassword) {
        const response = await axiosInstance.put('/auth/change-password', {
            current_password: currentPassword,
            new_password: newPassword
        })
        return response.data
    },

    async updateProfile(profileData) {
        const response = await axiosInstance.put('/auth/profile', profileData)
        return response.data
    },

    async uploadAvatar(formData) {
        const response = await axiosInstance.post('/auth/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return response.data
    },

    async refreshToken() {
        const response = await axiosInstance.post('/auth/refresh')
        const { access_token } = response.data
        Cookies.set('access_token', access_token, { expires: 1 })
        return response.data
    },

    async forgotPassword(email) {
        const response = await axiosInstance.post('/auth/forgot-password', { email })
        return response.data
    },

    async resetPassword(token, newPassword) {
        const response = await axiosInstance.post('/auth/reset-password', { 
            token, 
            new_password: newPassword 
        })
        return response.data
    },

    async verifyEmail(token) {
        const response = await axiosInstance.get(`/auth/verify-email?token=${token}`)
        return response.data
    },

    async resendVerification(email) {
        const response = await axiosInstance.post('/auth/resend-verification', { email })
        return response.data
    },
}