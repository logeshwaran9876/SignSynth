import axios, { AxiosInstance,  AxiosResponse } from 'axios'

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add API key to headers
    const apiKey = import.meta.env.VITE_API_KEY || 'demo-api-key'
    if (apiKey) {
      config.headers['x-api-key'] = apiKey
    }

    // Add auth token if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`API Response: ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    console.error('API Response Error:', error)
    
    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // Unauthorized - clear auth token
          localStorage.removeItem('auth_token')
          window.location.href = '/login'
          break
        case 403:
          // Forbidden
          console.error('Access forbidden:', data.detail)
          break
        case 404:
          // Not found
          console.error('Resource not found:', data.detail)
          break
        case 429:
          // Rate limited
          console.error('Rate limited:', data.detail)
          break
        case 500:
          // Server error
          console.error('Server error:', data.detail)
          break
        default:
          console.error('API Error:', data.detail || 'Unknown error')
      }
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.message)
    } else {
      // Other error
      console.error('Error:', error.message)
    }
    
    return Promise.reject(error)
  }
)

// API methods
export const api = {
  // Health check
  health: () => apiClient.get('/health'),
  
  // Jobs
  getJobs: (params?: any) => apiClient.get('/jobs', { params }),
  getJob: (jobId: string) => apiClient.get(`/jobs/${jobId}`),
  deleteJob: (jobId: string) => apiClient.delete(`/jobs/${jobId}`),
  retryJob: (jobId: string) => apiClient.post(`/jobs/${jobId}/retry`),
  cancelJob: (jobId: string) => apiClient.delete(`/jobs/${jobId}`),
  
  // Generation
  createJob: (data: any) => apiClient.post('/generate', data),
  createPreview: (data: any) => apiClient.post('/generate/preview', data),
  getSupportedLanguages: () => apiClient.get('/generate/supported-languages'),
  getLimits: () => apiClient.get('/generate/limits'),
  
  // Download
  getDownloadUrl: (jobId: string) => apiClient.get(`/jobs/${jobId}/download`),
  
  // Admin
  getJobStats: (params?: any) => apiClient.get('/jobs/stats', { params }),
  adminGetJobs: (params?: any) => apiClient.get('/admin/jobs', { params }),
  adminDeleteJob: (jobId: string) => apiClient.delete(`/admin/jobs/${jobId}`),
}

export { apiClient }
export default apiClient

