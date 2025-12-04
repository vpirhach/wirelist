<template>
  <NConfigProvider>
    <NMessageProvider>
      <!-- Show loading spinner while auth is being initialized -->
      <div
        v-if="!isInitialized"
        class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"
      >
        <div class="flex flex-col items-center space-y-4">
          <NSpin size="large" />
          <p class="text-gray-600 dark:text-gray-400">{{ $t('wires.loading') }}</p>
        </div>
      </div>

      <!-- Show auth pages without layout -->
      <div v-else-if="isAuthPage" class="min-h-screen">
        <RouterView />
      </div>

      <!-- Show main layout for authenticated pages -->
      <div v-if="isAuthenticated">
        <LayoutWrapper>
          <RouterView />
        </LayoutWrapper>

        <Backdrop />
        <WireDetails />
      </div>
    </NMessageProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Backdrop from './components/Backdrop.vue'
import WireDetails from './components/WireDetails.vue'
import LayoutWrapper from './components/LayoutWrapper.vue'
import { NMessageProvider, NConfigProvider, NSpin } from 'naive-ui'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const authStore = useAuthStore()

// Check if current route is an auth page
const isAuthPage = computed(() => {
  const authRoutes = ['/login', '/register', '/unauthorized', '/not-found']
  return authRoutes.includes(route.path) || route.path.startsWith('/auth')
})

const isInitialized = computed(() => {
  return authStore.isInitialized
})

const isAuthenticated = computed(() => {
  return authStore.isAuthenticated
})
</script>
