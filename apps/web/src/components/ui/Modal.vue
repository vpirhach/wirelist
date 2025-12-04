<template>
  <div class="fixed inset-0 flex items-center justify-center overflow-y-auto z-99999">
    <div class="fixed inset-0 h-full w-full bg-gray-400/40 backdrop-blur-[12px]" aria-hidden="true"
      @click="$emit('close')"></div>
    <slot name="body"></slot>
  </div>
</template>

<script setup lang="ts">
interface ModalProps {
  fullScreenBackdrop?: boolean
}

defineProps<ModalProps>()
defineEmits(['close'])
</script>
