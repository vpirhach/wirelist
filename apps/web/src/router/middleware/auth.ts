import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export const authGuard = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => {
  const authStore = useAuthStore()

  console.log('Auth Guard - Route:', to.path)
  console.log('Auth Guard - Is Authenticated:', authStore.isAuthenticated)
  console.log('Auth Guard - Has Valid Tokens:', authStore.hasValidTokens)

  // Check if route requires authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    console.log('Route requires auth but user is not authenticated, redirecting to login')
    // Redirect to login page with return path
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  // Check if route requires guest (unauthenticated) access
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    console.log('Route requires guest but user is authenticated, redirecting to home')
    // Redirect authenticated users from guest-only pages (like login)
    next({ name: 'all-wires' })
    return
  }

  console.log('Auth Guard - Navigation allowed')
  next()
}

export const adminGuard = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => {
  const authStore = useAuthStore()

  // First run auth guard
  if (!authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  // Check if user has admin role
  if (authStore.currentUser?.role !== 'ADMIN') {
    // Redirect to unauthorized page or home
    next({ name: 'unauthorized' })
  } else {
    next()
  }
}
