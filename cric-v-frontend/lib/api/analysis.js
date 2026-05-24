import axiosInstance from './axios'

export const analysisApi = {
    async getSessionAnalysis(sessionId) {
        const response = await axiosInstance.get(`/analysis/session/${sessionId}`)
        return response.data
    },

    async getPlayerBowlingAnalysis(playerId, limit = 10) {
        const response = await axiosInstance.get(
            `/analysis/player/${playerId}/bowling`,
            { params: { limit } }
        )
        return response.data
    },

    async getPlayerBattingAnalysis(playerId, limit = 10) {
        const response = await axiosInstance.get(
            `/analysis/player/${playerId}/batting`,
            { params: { limit } }
        )
        return response.data
    },

    async triggerAnalysis(sessionId, analysisType) {
        const response = await axiosInstance.post(
            `/analysis/analyze/${sessionId}`,
            null,
            { params: { analysis_type: analysisType } }
        )
        return response.data
    },

    async triggerVideoAnalysis(videoId) {
        const response = await axiosInstance.post(`/analysis/analyze/video/${videoId}`)
        return response.data
    },

    async triggerSessionAllAnalysis(sessionId) {
        const response = await axiosInstance.post(`/analysis/analyze/session/${sessionId}/all`)
        return response.data
    },

    async getBattingInsights(playerId) {
        const response = await axiosInstance.get(
            `/analysis/insights/batting/${playerId}`
        )
        return response.data
    },

    async getBowlingInsights(playerId) {
        const response = await axiosInstance.get(
            `/analysis/insights/bowling/${playerId}`
        )
        return response.data
    },

    async createFeedback(sessionId, feedbackData) {
        const response = await axiosInstance.post(
            `/analysis/session/${sessionId}/feedback`,
            { ...feedbackData, session_id: sessionId }
        )
        return response.data
    },

    async getSessionFeedback(sessionId) {
        const response = await axiosInstance.get(
            `/analysis/session/${sessionId}/feedback`
        )
        return response.data
    },

    async updateFeedback(sessionId, feedbackId, feedbackData) {
        const response = await axiosInstance.put(
            `/analysis/session/${sessionId}/feedback/${feedbackId}`,
            feedbackData
        )
        return response.data
    },

    async getSessionDeliveries(sessionId) {
        const response = await axiosInstance.get(`/analysis/session/${sessionId}/deliveries`)
        return response.data
    }
}

export const getDeliveryClipUrl = (sessionId, deliveryId) =>
  `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/analysis/session/${sessionId}/deliveries/${deliveryId}/clip`;