<template>
  <div class="w-full overflow-hidden rounded-lg shadow-sm relative">
    <!-- Scroll Left Buttons -->
    <button
      v-if="showLeftButton"
      @click="scrollLeft"
      class="absolute left-2 top-0 z-30 bg-white shadow-lg rounded-full p-2 hover:bg-gray-100 transition-colors"
      aria-label="Scroll left"
    >
      <ChevronLeftIcon class="w-5 h-5 text-gray-700" />
    </button>

    <!-- Scroll Right Buttons -->
    <button
      v-if="showRightButton"
      @click="scrollRight"
      class="absolute right-2 top-0 z-30 bg-white shadow-lg rounded-full p-2 hover:bg-gray-100 transition-colors"
      aria-label="Scroll right"
    >
      <ChevronRightIcon class="w-5 h-5 text-gray-700" />
    </button>

    <div
      ref="scrollContainer"
      class="w-full overflow-x-auto overflow-y-auto"
      :style="{ maxHeight: maxHeight }"
      @scroll="handleScroll"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/solid'

interface Props {
  scrollAmount?: number
  maxHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  scrollAmount: 300,
  maxHeight: 'calc(100vh - 240px)', // Default max height for vertical scrolling
})

const emit = defineEmits<{
  scroll: [event: Event]
}>()

// Scroll state
const scrollContainer = ref<HTMLElement | null>(null)
const showLeftButton = ref(false)
const showRightButton = ref(false)

// Scroll functionality
const updateScrollButtons = () => {
  if (!scrollContainer.value) return

  const { scrollLeft, scrollWidth, clientWidth } = scrollContainer.value

  // Show left button if not at the start
  showLeftButton.value = scrollLeft > 0

  // Show right button if not at the end
  showRightButton.value = scrollLeft + clientWidth < scrollWidth - 1
}

const handleScroll = (event: Event) => {
  updateScrollButtons()
  // Emit scroll event for parent components to handle (e.g., infinite scroll)
  emit('scroll', event)
}

const scrollLeft = () => {
  if (!scrollContainer.value) return
  scrollContainer.value.scrollBy({ left: -props.scrollAmount, behavior: 'smooth' })
}

const scrollRight = () => {
  if (!scrollContainer.value) return
  scrollContainer.value.scrollBy({ left: props.scrollAmount, behavior: 'smooth' })
}

// Check scroll buttons on mount and window resize
onMounted(() => {
  updateScrollButtons()
  window.addEventListener('resize', updateScrollButtons)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScrollButtons)
})

// Expose methods to parent if needed
defineExpose({
  scrollLeft,
  scrollRight,
  updateScrollButtons,
  getScrollContainer: () => scrollContainer.value,
})
</script>
