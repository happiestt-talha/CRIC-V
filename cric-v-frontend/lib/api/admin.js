import axiosInstance from './axios'

export const adminApi = {
    async getStats() {
        const response = await axiosInstance.get('/admin/stats')
        return response.data
    },

    async getUsers() {
        const response = await axiosInstance.get('/admin/users')
        return response.data
    },

    async getSessions(filters = {}) {
        const response = await axiosInstance.get('/admin/sessions', {
            params: filters,
        })
        return response.data
    },

    async deleteSession(sessionId) {
        const response = await axiosInstance.delete(
            `/admin/sessions/${sessionId}`
        )
        return response.data
    },

    async getDashboardStats() {
        const response = await axiosInstance.get('/dashboard/stats')
        return response.data
    },
}