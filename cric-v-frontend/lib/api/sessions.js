import axiosInstance from './axios'

export const sessionsApi = {
    async createSession(sessionData) {
        const response = await axiosInstance.post('/sessions/', sessionData)
        return response.data
    },

    async getSessions(skip = 0, limit = 100, playerId = null) {
        const params = { skip, limit }
        if (playerId) params.player_id = playerId
        const response = await axiosInstance.get('/sessions/', { params })
        return response.data
    },

    async getSession(sessionId) {
        const response = await axiosInstance.get(`/sessions/${sessionId}`)
        return response.data
    },

    async uploadVideo(sessionId, videoFile, onProgress) {
        const formData = new FormData()
        formData.append('video_file', videoFile)

        const response = await axiosInstance.post(
            `/sessions/${sessionId}/upload`,
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (onProgress) {
                        const percent = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        )
                        onProgress(percent)
                    }
                },
            }
        )
        return response.data
    },

    async getVideos(sessionId) {
        const response = await axiosInstance.get(`/sessions/${sessionId}/videos`)
        return response.data
    },

    async deleteVideo(sessionId, videoId) {
        const response = await axiosInstance.delete(`/sessions/${sessionId}/videos/${videoId}`)
        return response.data
    },

    async getAnnotatedVideo(sessionId) {
        const response = await axiosInstance.get(
            `/sessions/${sessionId}/annotated-video`
        )
        return response.data
    },

    async quickUpload(videoFile, sessionType, playerId, title) {
        const formData = new FormData()
        formData.append('video', videoFile)
        formData.append('session_type', sessionType)
        formData.append('player_id', playerId)
        if (title) formData.append('title', title)

        const response = await axiosInstance.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return response.data
    },

    async deleteSession(sessionId) {
        const response = await axiosInstance.delete(`/sessions/${sessionId}`)
        return response.data
    },

    async getDeletePreview(sessionId) {
        const response = await axiosInstance.get(`/sessions/${sessionId}/delete-preview`)
        return response.data
    },
}

export const getAnnotatedVideoUrl = (sessionId) =>
  `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/sessions/${sessionId}/annotated-video`;

export const validateVideoUrl = (sessionId, url) =>
  axiosInstance.post(`/sessions/${sessionId}/validate-url`, { url })

export const importVideoFromUrl = (sessionId, url) =>
  axiosInstance.post(`/sessions/${sessionId}/import-url`, { url })