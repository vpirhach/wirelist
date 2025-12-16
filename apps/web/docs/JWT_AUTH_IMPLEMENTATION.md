# JWT Authentication Implementation

This document describes the JWT authentication system implemented for the Wirelist application.

## Overview

The authentication system implements JWT (JSON Web Tokens) with access and refresh token strategy, following security best practices for frontend applications.

## Key Features

- **Dual Token Strategy**: Uses both access tokens (short-lived) and refresh tokens (long-lived)
- **Secure Token Storage**: Access tokens in sessionStorage, refresh tokens in localStorage
- **Automatic Token Refresh**: Seamless token renewal without user intervention
- **Route Protection**: Role-based access control with route guards
- **Error Handling**: Comprehensive error handling and user feedback
- **Security Best Practices**: XSS protection, CSRF tokens, rate limiting

## API Endpoints

The authentication system expects the following API endpoints:

### 1. Login

- **Endpoint**: `POST /api/auth/login`
- **Request Body**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Response**:
  ```json
  {
    "accessToken": "string",
    "refreshToken": "string",
    "tokenType": "Bearer"
  }
  ```

### 2. Register

- **Endpoint**: `POST /api/auth/register`
- **Request Body**:
  ```json
  {
    "username": "string",
    "password": "string",
    "role": "ADMIN" | "USER"
  }
  ```
- **Response**:
  ```json
  {
    "accessToken": "string",
    "refreshToken": "string",
    "tokenType": "Bearer"
  }
  ```

### 3. Refresh Token

- **Endpoint**: `POST /api/auth/refresh`
- **Request Body**:
  ```json
  {
    "refreshToken": "string"
  }
  ```
- **Response**:
  ```json
  {
    "accessToken": "string",
    "refreshToken": "string",
    "tokenType": "Bearer"
  }
  ```

### 4. Validate Token

- **Endpoint**: `GET /api/auth/validate`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**:
  ```json
  {
    "valid": true,
    "role": "ADMIN",
    "userId": 2,
    "username": "pirhach"
  }
  ```

## Architecture

### Token Storage Strategy

1. **Access Tokens**: Stored in `sessionStorage`

   - Automatically cleared when browser tab/window is closed
   - Provides protection against XSS attacks that persist across browser sessions
   - Short-lived (typically 15-30 minutes)

2. **Refresh Tokens**: Stored in `localStorage`
   - Persists across browser sessions
   - Longer-lived (typically 7-30 days)
   - Used only for token refresh operations

### Automatic Token Refresh

The system implements automatic token refresh using Axios interceptors:

1. **Request Interceptor**: Attaches access token to all API requests
2. **Response Interceptor**: Detects 401 errors and attempts token refresh
3. **Queue Management**: Queues failed requests during token refresh
4. **Retry Logic**: Retries failed requests with new tokens

### Route Protection

Routes are protected using Vue Router navigation guards:

- **Authentication Guard**: Redirects unauthenticated users to login
- **Role-based Guard**: Restricts access based on user roles
- **Guest Guard**: Prevents authenticated users from accessing auth pages

## Security Best Practices

### 1. Token Security

- Access tokens stored in sessionStorage (cleared on browser close)
- Refresh tokens stored in localStorage (longer persistence)
- Tokens are never exposed in URLs or logs
- Automatic token cleanup on logout

### 2. XSS Protection

- Input sanitization using DOM-based methods
- Proper escaping of user-generated content
- Content Security Policy (CSP) headers recommended

### 3. CSRF Protection

- Tokens transmitted via Authorization headers (not cookies)
- CSRF token generation utility available
- SameSite cookie attributes for additional protection

### 4. Rate Limiting

- Client-side rate limiting to prevent brute force attacks
- Configurable attempt limits and time windows
- Automatic lockout after failed attempts

### 5. Password Security

- Password strength validation
- Minimum 4 characters with complexity requirements
- Uppercase, lowercase, numbers, and special characters

## File Structure

```
src/
├── api/
│   ├── auth.ts                 # Authentication API service
│   └── axiosInstance.ts        # Configured Axios instance
├── stores/
│   └── auth.ts                 # Pinia authentication store
├── types/
│   └── auth.ts                 # TypeScript type definitions
├── views/
│   ├── auth/
│   │   ├── LoginPage.vue       # Login page component
│   │   └── RegisterPage.vue    # Registration page component
│   ├── UnauthorizedPage.vue    # 403 error page
│   └── NotFoundPage.vue        # 404 error page
├── router/
│   ├── index.ts                # Router configuration
│   └── middleware/
│       └── auth.ts             # Authentication middleware
├── utils/
│   └── auth.ts                 # Authentication utilities
└── App.vue                     # Main application component
```

## Usage Examples

### Using the Auth Store

```typescript
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// Login
await authStore.login({ username: 'user', password: 'pass' })

// Register
await authStore.register({
  username: 'user',
  password: 'pass',
  role: 'USER',
})

// Logout
await authStore.logout()

// Check authentication status
if (authStore.isAuthenticated) {
  // User is logged in
}
```

### Protected Routes

```typescript
// routes with authentication requirements
{
  path: '/admin',
  component: AdminComponent,
  meta: {
    requiresAuth: true,
    requiredRole: 'ADMIN'
  }
}
```

### Making Authenticated API Calls

```typescript
import axiosInstance from '@/api/axiosInstance'

// Token is automatically attached by interceptor
const response = await axiosInstance.get('/api/protected-endpoint')
```

## Error Handling

The system provides comprehensive error handling:

1. **Network Errors**: Displayed to user with retry options
2. **Authentication Errors**: Automatic logout and redirect to login
3. **Authorization Errors**: Redirect to unauthorized page
4. **Token Refresh Errors**: Automatic logout and cleanup
5. **Form Validation Errors**: Real-time validation feedback

## Development Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables:

   ```env
   VITE_API_BASE_URL=http://localhost:3000
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## Testing

To test the authentication system:

1. **Login Flow**: Navigate to `/login` and test with valid credentials
2. **Registration Flow**: Navigate to `/register` and create a new account
3. **Protected Routes**: Try accessing protected routes without authentication
4. **Token Refresh**: Wait for token expiration and observe automatic refresh
5. **Logout**: Test logout functionality and token cleanup

## Security Considerations

1. **HTTPS Only**: Always use HTTPS in production
2. **Token Expiration**: Keep access tokens short-lived (15-30 minutes)
3. **Refresh Token Rotation**: Implement refresh token rotation on server
4. **Secure Headers**: Set appropriate security headers on server
5. **Regular Audits**: Regularly audit authentication flows and tokens

## Troubleshooting

### Common Issues

1. **Token Not Attached**: Check Axios interceptor configuration
2. **Infinite Refresh Loop**: Verify refresh token endpoint and expiration
3. **CORS Issues**: Configure CORS properly on backend
4. **Storage Issues**: Check browser storage permissions

### Debug Mode

Enable debug mode by setting:

```javascript
localStorage.setItem('debug', 'true')
```

This will log authentication events to the console.

## Contributing

When contributing to the authentication system:

1. Follow security best practices
2. Add proper TypeScript types
3. Include comprehensive error handling
4. Write unit tests for new functionality
5. Update documentation as needed

## License

This implementation follows the project's license terms.
