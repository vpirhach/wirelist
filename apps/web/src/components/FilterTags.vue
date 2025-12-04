<template>
  <div class="flex flex-wrap gap-2" :class="{ 'mb-4': Object.keys(filters).length > 0 }">
    <div v-for="(filter, columnKey) in filters" :key="columnKey" class="flex flex-wrap gap-2">
      <template v-for="(options, filterKey) in filter" :key="filterKey">
        <NTag
          closable
          @close="removeTag(columnKey, filterKey)"
          v-for="option in options"
          :key="option"
        >
          {{ t(`table.filters.${columnKey}`) }}: {{ t(`table.filters.${filterKey}`) }} {{ option }}
        </NTag>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { c, NTag } from 'naive-ui'
import { useWireFiltersStore } from '@/stores/wireFilters'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const wireFiltersStore = useWireFiltersStore()

const filters = computed(() => wireFiltersStore.filters)

watch(filters, () => {
  console.log(filters.value)
})

const removeTag = (filterKey: string, option: string) => {
  // wireFiltersStore.removeFilter(filterKey, option)
}
</script>

<style lang="scss" scoped></style>
