<template>
  <div class="w-52">
    <n-select
      v-model:value="value"
      size="large"
      :options="options"
      :placeholder="t('units.select')"
      @update:value="handleSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { NSelect } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { computed, ref } from 'vue'

const { t } = useI18n()

const props = defineProps<{
  units: string[]
}>()

const emit = defineEmits<{
  (e: 'update:units', units: string[]): void
}>()

const value = ref<string | null>(null)

const options = computed(() => [
  {
    label: t('units.allUnits'),
    value: '',
  },
  ...props.units.map((unit) => ({
    label: t('units.unit', { unit }),
    value: unit,
  })),
])

const handleSelect = (key: string | null) => {
  if (key) {
    emit('update:units', [key])
  } else {
    emit('update:units', [])
  }
}
</script>

<style scoped></style>
