// API Configuration
export const API_CONFIG = {
  // Base URL for the Node.js NestJS backend
  baseUrl: import.meta.env.VITE_API_BASE_URL_V2 || 'http://localhost:3002',
}

// Export for easy access
export const { baseUrl } = API_CONFIG
