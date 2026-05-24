import axiosInstance from './axios'

export const ballTrackingApi = {
    async analyzeVideo(videoFile, sessionId = null) {
        const formData = new FormData()
        formData.append('video', videoFile)

        const params = {}
        if (sessionId) params.session_id = sessionId

        const response = await axiosInstance.post(
            '/ball-tracking/analyze',
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' },
                params,
            }
        )
        return response.data
    },

    async getTaskStatus(taskId) {
        const response = await axiosInstance.get(`/tasks/${taskId}`)
        return response.data
    },
}