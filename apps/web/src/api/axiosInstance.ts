import axios, { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios'

// API Base URL (Node.js NestJS backend)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL_V2 ?? 'http://localhost:3002'

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Flag to prevent multiple refresh attempts
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (error?: any) => void
}> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  })

  failedQueue = []
}

// Request interceptor
const requestInterceptor = (config: InternalAxiosRequestConfig) => {
  // Get access token from sessionStorage (more secure than localStorage)
  const token = sessionStorage.getItem('accessToken')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}

// Response interceptor for handling token refresh
const responseErrorInterceptor = async (error: AxiosError) => {
  const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

  // Handle 401 errors (unauthorized) - attempt token refresh
  if (error.response?.status === 401 && !originalRequest._retry) {
    if (isRefreshing) {
      // If already refreshing, queue the request
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`
          }
          return axiosInstance(originalRequest)
        })
        .catch((err) => {
          return Promise.reject(err)
        })
    }

    originalRequest._retry = true
    isRefreshing = true

    const refreshToken = localStorage.getItem('refreshToken')

    if (!refreshToken) {
      // No refresh token available, redirect to login
      processQueue(error, null)
      isRefreshing = false
      // Clear any remaining tokens
      sessionStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      // Redirect to login page
      window.location.href = '/login'
      return Promise.reject(error)
    }

    try {
      // Attempt to refresh the token
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/refresh`,
        { refreshToken },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )

      const { accessToken, refreshToken: newRefreshToken } = response.data

      // Store new tokens
      sessionStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', newRefreshToken)

      // Process the queue with the new token
      processQueue(null, accessToken)

      // Retry the original request with new token
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
      }

      return axiosInstance(originalRequest)
    } catch (refreshError) {
      // Refresh failed, clear tokens and redirect to login
      processQueue(refreshError, null)
      sessionStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')

      // Redirect to login page
      window.location.href = '/login'

      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }

  // Handle other error statuses
  if (error.response) {
    switch (error.response.status) {
      case 403:
        console.error('Access forbidden:', error.response.data)
        break
      case 404:
        console.error('Resource not found:', error.response.data)
        break
      case 500:
        console.error('Server error:', error.response.data)
        break
      default:
        console.error('API Error:', error.response.status, error.response.data)
    }
  } else if (error.request) {
    console.error('Network error - no response received:', error.request)
  } else {
    console.error('Request configuration error:', error.message)
  }

  return Promise.reject(error)
}

// Apply interceptors
axiosInstance.interceptors.request.use(requestInterceptor, (error: AxiosError) =>
  Promise.reject(error),
)

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  responseErrorInterceptor,
)

export default axiosInstance
