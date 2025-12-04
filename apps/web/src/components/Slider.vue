<template>
  <div class="fixed inset-0 flex items-center justify-center overflow-y-auto z-99999">
    <div
      class="fixed inset-0 h-full w-full bg-gray-400/40 backdrop-blur-[4px]"
      aria-hidden="true"
      @click="onClose"
    ></div>

    <div
      :class="[
        'absolute top-0 right-0 min-w-3xl h-screen bg-white shadow-lg transition-all overflow-hidden duration-300 ease-out z-99999 border-r border-gray-200',
        {
          'lg:translate-x-0': showBodyTransition,
          'lg:translate-x-[100%]': !showBodyTransition,
        },
      ]"
    >
      <div class="relative overflow-y-auto h-full">
        <button @click="onClose" class="absolute top-0 right-0 p-4">
          <XMarkIcon class="w-6 h-6" />
        </button>

        <header class="p-4 border-b border-gray-200">
          <slot name="header"></slot>
        </header>

        <section class="p-4 border-b border-gray-200">
          <slot name="body"></slot>
        </section>

        <footer v-if="$slots.footer" class="sticky bottom-0 border-t border-gray-200 bg-white p-4">
          <slot name="footer"></slot>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineEmits, defineExpose, onMounted, onUnmounted, ref } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/solid'

const emit = defineEmits(['close'])
const showBodyTransition = ref(false)

onMounted(() => {
  document.body.classList.add('overflow-hidden')

  setTimeout(() => {
    showBodyTransition.value = true
  }, 100)
})

onUnmounted(() => {
  document.body.classList.remove('overflow-hidden')
})

const onClose = () => {
  showBodyTransition.value = false

  const promise = new Promise((resolve) => {
    setTimeout(() => {
      emit('close')
      resolve(true)
    }, 300)
  })

  return promise
}

defineExpose({ onClose })
</script>
