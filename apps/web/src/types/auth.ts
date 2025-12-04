export interface User {
  id: string | number
  username: string
  role: 'ADMIN' | 'USER'
  email?: string
  createdAt?: string
  updatedAt?: string
  firstName?: string
  lastName?: string
  fullName?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType: string
}

export interface LoginCredentials {
  username: string
  firstName?: string
  lastName?: string
  password: string
}

export interface RegisterCredentials {
  username: string
  firstName?: string
  lastName?: string
  password: string
  role?: 'ADMIN' | 'USER'
}

export interface AuthResponse {
  user: User
  tokens: AuthTokens
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  initialized: boolean
}

export interface TokenRefreshResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
}

export interface ValidationResponse {
  valid: boolean
  role?: 'ADMIN' | 'USER'
  userId?: number
  username?: string
  fullName?: string
  firstName?: string
  lastName?: string
}
