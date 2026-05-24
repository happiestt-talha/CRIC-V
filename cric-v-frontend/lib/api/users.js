import axiosInstance from './axios'

export const usersApi = {
    async getUsers(skip = 0, limit = 100) {
        const response = await axiosInstance.get('/users/', {
            params: { skip, limit },
        })
        return response.data
    },

    async getUser(userId) {
        const response = await axiosInstance.get(`/users/${userId}`)
        return response.data
    },

    async getPlayersByCoach(userId, playerId) {
        const response = await axiosInstance.get(`/users/${userId}/players`, {
            params: { player_id: playerId },
        })
        return response.data
    },

    async createPlayer(playerData) {
        const response = await axiosInstance.post('/users/players', playerData)
        return response.data
    },

    async createPlayerWithCredentials(playerData) {
        const response = await axiosInstance.post('/users/players/create-with-credentials', playerData)
        return response.data
    },

    async getPlayerPerformance(playerId) {
        const response = await axiosInstance.get(
            `/users/performance/player/${playerId}`
        )
        return response.data
    },
}