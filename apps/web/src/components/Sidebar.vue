<template>
  <div>
    <router-link to="/" class="flex items-center gap-2 p-4 min-h-[76px]">
      <img
        src="/images/logo/logo.png"
        alt="Wirelist"
        class="h-8 w-auto transition-all duration-300 ease-in-out"
        :class="{ 'h-10': !collapsed }"
      />
      <span v-if="!collapsed" class="text-xl font-bold whitespace-nowrap">{{
        $t('app.name')
      }}</span>
    </router-link>

    <n-menu
      v-model:value="activeKey"
      :collapsed="collapsed"
      :collapsed-width="64"
      :collapsed-icon-size="22"
      :options="menuOptions"
      @update:value="onMenuUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { NMenu, NIcon } from 'naive-ui'
import { ref, computed, h, type Component, watch, defineProps } from 'vue'
import {
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/vue/24/outline'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter, RouterLink } from 'vue-router'

const { t } = useI18n()

const props = defineProps<{
  collapsed: boolean
}>()

const activeKey = ref('')

const route = useRoute()
const router = useRouter()
const routeName = computed(() => route.name)

watch(routeName, (value) => {
  const matchingOption = menuOptions.value.find((option) => option.key === value)

  if (matchingOption) {
    activeKey.value = matchingOption.key as string
  }
})

watch(activeKey, (value) => {
  router.push({ name: value })
})

const activeMenuItem = ref('')

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const menuOptions = computed<{ key: string; label: string }[]>(() => [
  {
    key: 'all-wires',
    label: t('sidebar.list'),
    icon: renderIcon(ClipboardDocumentListIcon),
  },
  {
    key: 'review-updates',
    label: t('sidebar.reviewUpdates'),
    icon: renderIcon(ClipboardDocumentCheckIcon),
  },
])

function onMenuUpdate(key: string) {
  console.log(key)
}
</script>

<style scoped></style>
