import axiosInstance from './axiosInstance'
import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  TokenRefreshResponse,
  ValidationResponse,
  User,
} from '@/types/auth'

const AUTH_BASE_URL = '/api/auth'

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axiosInstance.post(`${AUTH_BASE_URL}/login`, credentials)
    const { accessToken, refreshToken, tokenType } = response.data

    // Store tokens securely
    this.storeTokens(accessToken, refreshToken)

    // Get user info from validation endpoint
    const userResponse = await this.validate()

    return {
      user: this.createUserFromValidationResponse(userResponse),
      tokens: { accessToken, refreshToken, tokenType },
    }
  },

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await axiosInstance.post(`${AUTH_BASE_URL}/register`, credentials)
    const { accessToken, refreshToken, tokenType } = response.data

    // Store tokens securely
    this.storeTokens(accessToken, refreshToken)

    // Get user info from validation endpoint
    const userResponse = await this.validate()

    return {
      user: this.createUserFromValidationResponse(userResponse),
      tokens: { accessToken, refreshToken, tokenType },
    }
  },

  async refreshToken(): Promise<TokenRefreshResponse> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await axiosInstance.post(`${AUTH_BASE_URL}/refresh`, {
      refreshToken,
    })

    const { accessToken, refreshToken: newRefreshToken, tokenType } = response.data

    // Store new tokens
    this.storeTokens(accessToken, newRefreshToken)

    return { accessToken, refreshToken: newRefreshToken, tokenType }
  },

  async validate(): Promise<ValidationResponse> {
    const response = await axiosInstance.get(`${AUTH_BASE_URL}/validate`)
    return response.data
  },

  async logout(): Promise<void> {
    // Always clear tokens, even if logout request fails
    this.clearTokens()
  },

  // Helper method to create User object from ValidationResponse
  createUserFromValidationResponse(validationResponse: ValidationResponse): User {
    if (!validationResponse.valid || !validationResponse.userId || !validationResponse.username) {
      throw new Error('Invalid validation response')
    }

    return {
      id: validationResponse.userId,
      username: validationResponse.username,
      role: validationResponse.role || 'USER',
      firstName: validationResponse.firstName,
      lastName: validationResponse.lastName,
      fullName: validationResponse.fullName,
    }
  },

  // Token management methods
  storeTokens(accessToken: string, refreshToken: string): void {
    // Use sessionStorage for access tokens (more secure for XSS)
    sessionStorage.setItem('accessToken', accessToken)
    // Use localStorage for refresh tokens (survives browser restarts)
    localStorage.setItem('refreshToken', refreshToken)
  },

  getAccessToken(): string | null {
    return sessionStorage.getItem('accessToken')
  },

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken')
  },

  clearTokens(): void {
    sessionStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  },

  // Check if user has valid tokens
  hasValidTokens(): boolean {
    return !!(this.getAccessToken() && this.getRefreshToken())
  },
}
