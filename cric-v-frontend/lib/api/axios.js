import axios from 'axios'
import Cookies from 'js-cookie'
import { API_BASE_URL } from '../utils/constants'

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor — attach token
axiosInstance.interceptors.request.use(
    (config) => {
        const token = Cookies.get('access_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor — handle 401
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            Cookies.remove('access_token')
            Cookies.remove('refresh_token')
            if (typeof window !== 'undefined') {
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

export default axiosInstance