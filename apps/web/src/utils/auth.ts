/**
 * JWT Authentication Utilities
 * Provides secure token handling and validation functions
 */

/**
 * Decode JWT token payload without verification
 * This is used for client-side token inspection only
 * Server-side validation is still required for security
 */
export const decodeJWT = (token: string): any => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Failed to decode JWT token:', error)
    return null
  }
}

/**
 * Check if JWT token is expired
 * Returns true if token is expired or invalid
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = decodeJWT(token)
    if (!payload || !payload.exp) {
      return true
    }

    // Check if token is expired (with 30 second buffer)
    const currentTime = Math.floor(Date.now() / 1000)
    return payload.exp < currentTime + 30
  } catch (error) {
    return true
  }
}

/**
 * Get token expiration time in milliseconds
 */
export const getTokenExpiration = (token: string): number | null => {
  try {
    const payload = decodeJWT(token)
    if (!payload || !payload.exp) {
      return null
    }
    return payload.exp * 1000
  } catch (error) {
    return null
  }
}

/**
 * Check if user has specific role
 */
export const hasRole = (userRole: string, requiredRole: string): boolean => {
  if (requiredRole === 'USER') {
    return userRole === 'USER' || userRole === 'ADMIN'
  }
  return userRole === requiredRole
}

/**
 * Secure token storage using sessionStorage for access tokens
 * and localStorage for refresh tokens
 */
export const tokenStorage = {
  setAccessToken: (token: string): void => {
    sessionStorage.setItem('accessToken', token)
  },

  getAccessToken: (): string | null => {
    return sessionStorage.getItem('accessToken')
  },

  setRefreshToken: (token: string): void => {
    localStorage.setItem('refreshToken', token)
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem('refreshToken')
  },

  clearTokens: (): void => {
    sessionStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  },

  hasTokens: (): boolean => {
    return !!(tokenStorage.getAccessToken() && tokenStorage.getRefreshToken())
  },
}

/**
 * Generate a secure random string for CSRF protection
 */
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate password strength
 */
export const validatePasswordStrength = (
  password: string,
): {
  isValid: boolean
  errors: string[]
} => {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Sanitize user input to prevent XSS attacks
 */
export const sanitizeInput = (input: string): string => {
  const div = document.createElement('div')
  div.textContent = input
  return div.innerHTML
}

/**
 * Rate limiting helper for preventing brute force attacks
 */
export const rateLimiter = {
  attempts: new Map<string, { count: number; lastAttempt: number }>(),

  canAttempt: (identifier: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean => {
    const now = Date.now()
    const record = rateLimiter.attempts.get(identifier)

    if (!record) {
      rateLimiter.attempts.set(identifier, { count: 1, lastAttempt: now })
      return true
    }

    // Reset if window has passed
    if (now - record.lastAttempt > windowMs) {
      rateLimiter.attempts.set(identifier, { count: 1, lastAttempt: now })
      return true
    }

    // Check if max attempts reached
    if (record.count >= maxAttempts) {
      return false
    }

    // Increment attempts
    record.count++
    record.lastAttempt = now

    return true
  },

  clearAttempts: (identifier: string): void => {
    rateLimiter.attempts.delete(identifier)
  },
}
