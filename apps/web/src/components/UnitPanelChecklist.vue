<template>
  <div class="flex flex-col gap-4 p-4">
    <div class="space-y-2">
      <h3 class="text-lg font-medium">{{ t('units.title') }}</h3>
      <div class="flex flex-wrap gap-2">
        <NCheckbox v-for="unit in units" :key="unit" v-model:checked="checkedUnits[unit]">
          {{ unit }}
        </NCheckbox>
      </div>
    </div>

    <div class="space-y-2">
      <h3 class="text-lg font-medium">{{ t('panels.title') }}</h3>
      <div class="flex flex-wrap gap-2">
        <NCheckbox v-for="panel in panels" :key="panel" v-model:checked="checkedPanels[panel]">
          {{ panel }}
        </NCheckbox>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { NCheckbox } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useWiresStore } from '@/stores/wires'

const { t } = useI18n()
const wiresStore = useWiresStore()

// Get units and panels from the store
const units = computed(() => wiresStore.units)
const panels = computed(() => wiresStore.panels)

// Track checked state
const checkedUnits = reactive<Record<string, boolean>>({})
const checkedPanels = reactive<Record<string, boolean>>({})

// Computed properties for filtered options
const filteredUnits = computed(() => units.value.filter((unit) => checkedUnits[unit]))

const filteredPanels = computed(() => panels.value.filter((panel) => checkedPanels[panel]))

// Initialize data
onMounted(async () => {
  await wiresStore.fetchUnitsAndPanels()
})
</script>

<style lang="scss" scoped>
.n-checkbox {
  @apply m-1;
}
</style>
