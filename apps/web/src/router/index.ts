import { createRouter, createWebHistory } from 'vue-router'
import { authGuard } from './middleware/auth'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { left: 0, top: 0 }
  },
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/auth/LoginPage.vue'),
      meta: {
        title: 'Login',
        requiresGuest: true,
      },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/auth/RegisterPage.vue'),
      meta: {
        title: 'Register',
        requiresGuest: true,
      },
    },
    {
      path: '/',
      name: 'all-wires',
      component: () => import('../views/MainList.vue'),
      meta: {
        title: 'All wires',
        requiresAuth: true,
      },
    },
    {
      path: '/review-updates',
      name: 'review-updates',
      component: () => import('../views/ReviewUpdates.vue'),
      meta: {
        title: 'Review Updates',
        requiresAuth: true,
      },
    },
    {
      path: '/unauthorized',
      name: 'unauthorized',
      component: () => import('../views/UnauthorizedPage.vue'),
      meta: {
        title: 'Unauthorized',
      },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundPage.vue'),
      meta: {
        title: 'Page Not Found',
      },
    },
  ],
})

// Global navigation guard
router.beforeEach(async (to, from, next) => {
  // Set document title
  document.title = `Wirelist - ${to.meta.title} | NTC - PMT Helper`

  const authStore = useAuthStore()

  // Wait for auth to be initialized before proceeding
  if (!authStore.isInitialized) {
    console.log('Router - Waiting for auth initialization...')
    try {
      await authStore.initializeAuth()
    } catch (error) {
      console.error('Router - Failed to initialize auth:', error)
    }
  }

  // Run auth guard after initialization
  await authGuard(to, from, next)
})

export default router
