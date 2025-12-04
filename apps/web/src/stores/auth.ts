import { defineStore } from 'pinia'
import { authService } from '@/api/auth'
import type { AuthState, LoginCredentials, RegisterCredentials, User } from '@/types/auth'

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    loading: false,
    error: null,
    initialized: false,
  }),

  getters: {
    currentUser: (state) => state.user,
    isLoggedIn: (state) => state.isAuthenticated,
    hasValidTokens: (state) => {
      // Check both state and storage for tokens
      const accessToken = state.accessToken || authService.getAccessToken()
      const refreshToken = state.refreshToken || authService.getRefreshToken()
      return !!(accessToken && refreshToken)
    },
    isInitialized: (state) => state.initialized,
  },

  actions: {
    async initializeAuth() {
      console.log('Auth Store - Initializing authentication...')

      // Check if user has stored tokens and validate them
      if (authService.hasValidTokens()) {
        console.log('Auth Store - Found stored tokens, validating...')
        try {
          const response = await authService.validate()
          console.log('Auth Store - Validation response:', response)

          if (response.valid && response.userId && response.username) {
            console.log('Auth Store - Token validation successful, restoring user session')

            // Create user object from validation response
            const user = authService.createUserFromValidationResponse(response)

            this.user = user
            this.accessToken = authService.getAccessToken()
            this.refreshToken = authService.getRefreshToken()
            this.isAuthenticated = true
            console.log('Auth Store - User authenticated:', user.username)
          } else {
            console.log('Auth Store - Token validation failed, clearing tokens')
            // Invalid tokens, clear them
            authService.clearTokens()
            this.clearAuthState()
          }
        } catch (error) {
          console.error('Auth Store - Token validation error:', error)
          // Validation failed, clear tokens
          authService.clearTokens()
          this.clearAuthState()
        }
      } else {
        console.log('Auth Store - No valid tokens found')
        this.clearAuthState()
      }

      this.initialized = true
    },

    async login(credentials: LoginCredentials) {
      this.loading = true
      this.error = null
      try {
        const { user, tokens } = await authService.login(credentials)
        this.user = user
        this.accessToken = tokens.accessToken
        this.refreshToken = tokens.refreshToken
        this.isAuthenticated = true
        console.log('Auth Store - Login successful for user:', user.username)
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'An error occurred during login'
        throw error
      } finally {
        this.loading = false
      }
    },

    async register(credentials: RegisterCredentials) {
      this.loading = true
      this.error = null
      try {
        const { user, tokens } = await authService.register(credentials)
        this.user = user
        this.accessToken = tokens.accessToken
        this.refreshToken = tokens.refreshToken
        this.isAuthenticated = true
        console.log('Auth Store - Registration successful for user:', user.username)
      } catch (error) {
        this.error =
          error instanceof Error ? error.message : 'An error occurred during registration'
        throw error
      } finally {
        this.loading = false
      }
    },

    async logout() {
      this.loading = true
      try {
        await authService.logout()
        console.log('Auth Store - Logout successful')
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'An error occurred during logout'
        // Continue with logout even if request fails
        console.error('Auth Store - Logout error:', error)
      } finally {
        this.clearAuthState()
        this.loading = false
      }
    },

    async refreshTokens() {
      try {
        const tokens = await authService.refreshToken()
        this.accessToken = tokens.accessToken
        this.refreshToken = tokens.refreshToken
        console.log('Auth Store - Token refresh successful')
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to refresh token'
        console.error('Auth Store - Token refresh failed:', error)
        this.clearAuthState()
        throw error
      }
    },

    setUser(user: User) {
      this.user = user
      this.isAuthenticated = true
    },

    clearAuthState() {
      console.log('Auth Store - Clearing authentication state')
      this.user = null
      this.accessToken = null
      this.refreshToken = null
      this.isAuthenticated = false
      this.error = null
      // Keep initialized as true - we don't want to show loading screen again
    },

    clearError() {
      this.error = null
    },
  },
})
