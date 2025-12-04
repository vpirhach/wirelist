<template>
  <div class="flex items-center justify-between gap-2">
    <div>{{ label }}</div>
    <TableColumnFilter :filters="filters" @apply="applyFilters($event)" />
  </div>
</template>

<script setup lang="ts">
import TableColumnFilter from '@/components/TableColumnFilter.vue'
import { useI18n } from 'vue-i18n'
import type { PropType } from 'vue'

type Filter = {
  label: string
  options: { label: string; key: string }[]
}

defineProps({
  label: {
    type: String,
    required: true,
  },
  filters: {
    type: Object as PropType<Record<string, Filter>>,
    required: true,
  },
})

const emit = defineEmits(['apply'])

const { t } = useI18n()

const applyFilters = (event: Record<string, string[]>) => {
  emit('apply', event)
}
</script>

<style lang="scss" scoped></style>
