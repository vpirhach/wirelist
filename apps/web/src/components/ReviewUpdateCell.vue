<template>
  <div class="py-1 px-2">
    <!-- Show updated values (old strikethrough red, new green) -->
    <span v-if="hasUpdate" class="inline-flex flex-col gap-0.5">
      <span class="line-through text-red-500 text-xs">{{ formatValue(updateInfo?.oldValue) }}</span>
      <span class="text-green-600 font-medium">{{ formatValue(updateInfo?.newValue) }}</span>
    </span>
    <!-- Normal value (no update) -->
    <span v-else>{{ displayValue }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface UpdateInfo {
  newValue: any
  oldValue: any
}

interface Props {
  value: any
  hasUpdate?: boolean
  updateInfo?: UpdateInfo | null
}

const props = withDefaults(defineProps<Props>(), {
  hasUpdate: false,
  updateInfo: null,
})

const displayValue = computed(() => {
  if (props.value === null || props.value === undefined) {
    return ''
  }
  return String(props.value)
})

const formatValue = (value: any): string => {
  if (value === null || value === undefined || value === '') {
    return '(empty)'
  }
  return String(value)
}
</script>
