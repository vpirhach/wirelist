<template>
  <div class="flex items-center space-x-2">
    <div v-for="lang in availableLanguages" :key="lang.code">
      <NButton
        size="small"
        secondary
        :type="currentLocale === lang.code ? 'info' : 'default'"
        @click="changeLocale(lang.code)"
      >
        {{ lang.name }}
      </NButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NButton } from 'naive-ui'

const { locale } = useI18n()

const availableLanguages = [
  { code: 'en', name: 'EN' },
  { code: 'uk', name: 'UK' },
]

const currentLocale = computed(() => locale.value)

const changeLocale = (lang: string) => {
  locale.value = lang
  localStorage.setItem('locale', lang)
}
</script>
