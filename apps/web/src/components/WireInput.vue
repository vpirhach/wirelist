<template>
  <div>
    <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
      {{ label }}
    </label>
    <div class="relative">
      <span v-if="icon"
        class="absolute left-0 top-1/2 -translate-y-1/2 border-r border-gray-200 px-3.5 py-3 text-gray-500 dark:border-gray-800 dark:text-gray-400">
        <component :is="icon" class="w-5 h-5" />
      </span>
      <input type="text" :placeholder="placeholder" :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pl-[62px] text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps(['placeholder', 'label', 'icon', 'modelValue']);
defineEmits(['update:modelValue']) // Allows v-model to work
</script>

<style lang="scss" scoped></style>
