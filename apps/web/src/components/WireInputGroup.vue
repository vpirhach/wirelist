<template>
  <div :class="outlinedClasses">
    <p class="font-medium text-gray-700 mb-2" v-if="props.label">{{ props.label }}</p>
    <div :class="[inlineClasses]">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref, onMounted, getCurrentInstance } from 'vue'

const props = defineProps<{
  inline?: boolean,
  outlined?: boolean,
  label?: string,
}>()

const inlineClasses = ref({
  [`flex flex-nowrap flex-row space-x-4`]: props.inline,
  [`flex flex-col space-y-4`]: !props.inline,
});

const outlinedClasses = ref({
  'p-4 border border-gray-200 rounded-lg shadow-theme-xs': props.outlined,
});

</script>

<style lang="scss" scoped></style>
