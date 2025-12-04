<template>
  <div>
    <n-tabs
      type="line"
      animated
      v-model:value="selectedTab"
      justify-content="center"
      size="large"
      class="w-full"
    >
      <n-tab-pane
        v-for="option in menuOptions"
        :key="option.key"
        :name="option.key"
        :tab="option.label"
      />
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { NTabs, NTabPane } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const routeName = computed(() => route.name)

const menuOptions = computed<{ key: string; label: string }[]>(() => [
  {
    key: 'all-wires',
    label: t('sidebar.list'),
  },
  {
    key: 'review-updates',
    label: t('sidebar.reviewUpdates'),
  },
])

const selectedTab = ref('all-wires')
const defaultTab = ref('all-wires')

watch(routeName, (value) => {
  const matchingOption = menuOptions.value.find((option) => option.key === value)

  if (matchingOption) {
    selectedTab.value = matchingOption.key as string
  }
})

watch(selectedTab, (value) => {
  router.push({ name: value })
})
</script>

<style lang="scss" scoped></style>
