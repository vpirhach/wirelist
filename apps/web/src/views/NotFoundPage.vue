<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-900"
  >
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <img
          class="mx-auto h-32 w-auto"
          src="/images/error/404.svg"
          :alt="$t('auth.pages.notFound.title')"
        />
        <h2 class="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
          {{ $t('auth.pages.notFound.title') }}
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {{ $t('auth.pages.notFound.message') }}
        </p>
        <div class="mt-6 space-y-3">
          <Button @click="goBack" variant="primary" class="w-full">
            {{ $t('auth.pages.notFound.goBack') }}
          </Button>
          <Button @click="goHome" variant="outline" class="w-full">
            {{ $t('auth.pages.notFound.goHome') }}
          </Button>
        </div>
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
  router.go(-1)
}

const goHome = () => {
  router.push('/')
}
</script>
