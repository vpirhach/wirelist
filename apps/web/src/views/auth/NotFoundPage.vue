<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-900"
  >
    <div class="w-full max-w-md text-center">
      <div class="mb-8">
        <img
          class="mx-auto h-32 w-auto dark:hidden"
          src="/images/error/404.svg"
          :alt="$t('auth.pages.notFound.title')"
        />
        <img
          class="mx-auto h-32 w-auto hidden dark:block"
          src="/images/error/404-dark.svg"
          :alt="$t('auth.pages.notFound.title')"
        />
      </div>

      <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h1>

      <h2 class="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
        {{ $t('auth.pages.notFound.title') }}
      </h2>

      <p class="text-gray-600 dark:text-gray-400 mb-8">
        {{ $t('auth.pages.notFound.message') }}
      </p>

      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <Button @click="goBack" variant="outline" size="md">
          {{ $t('auth.pages.notFound.goBack') }}
        </Button>

        <Button @click="goHome" variant="primary" size="md">
          {{ $t('auth.pages.notFound.goHome') }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from '@/components/Button.vue'

const router = useRouter()
const { t } = useI18n()

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const goHome = () => {
  router.push('/')
}
</script>
