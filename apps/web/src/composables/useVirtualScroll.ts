import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'

export interface VirtualScrollOptions {
  /** Total number of items */
  itemCount: Ref<number>
  /** Height of each item in pixels */
  itemHeight: number
  /** Number of items to render above/below visible area */
  overscan?: number
  /** Container element ref */
  containerRef: Ref<HTMLElement | null>
}

export interface VirtualScrollReturn {
  /** Visible items range */
  visibleRange: Ref<{ start: number; end: number }>
  /** Total height of the virtual content */
  totalHeight: Ref<number>
  /** Offset from top for the rendered items */
  offsetY: Ref<number>
  /** Handle scroll event */
  handleScroll: (event: Event) => void
  /** Scroll to specific index */
  scrollToIndex: (index: number) => void
  /** Current scroll position */
  scrollTop: Ref<number>
  /** Is near bottom (for infinite scroll) */
  isNearBottom: Ref<boolean>
}

export function useVirtualScroll(options: VirtualScrollOptions): VirtualScrollReturn {
  const { itemCount, itemHeight, overscan = 5, containerRef } = options

  const scrollTop = ref(0)
  const containerHeight = ref(0)

  // Total height of all items
  const totalHeight = computed(() => itemCount.value * itemHeight)

  // Calculate visible range
  const visibleRange = computed(() => {
    const startIndex = Math.floor(scrollTop.value / itemHeight)
    const visibleCount = Math.ceil(containerHeight.value / itemHeight)

    // Add overscan
    const start = Math.max(0, startIndex - overscan)
    const end = Math.min(itemCount.value, startIndex + visibleCount + overscan)

    return { start, end }
  })

  // Offset for positioning rendered items
  const offsetY = computed(() => visibleRange.value.start * itemHeight)

  // Check if near bottom (for infinite scroll trigger)
  const isNearBottom = computed(() => {
    const scrollBottom = scrollTop.value + containerHeight.value
    const threshold = totalHeight.value * 0.8
    return scrollBottom >= threshold
  })

  const handleScroll = (event: Event) => {
    const target = event.target as HTMLElement
    if (target) {
      scrollTop.value = target.scrollTop
    }
  }

  const scrollToIndex = (index: number) => {
    if (containerRef.value) {
      containerRef.value.scrollTop = index * itemHeight
    }
  }

  const updateContainerHeight = () => {
    if (containerRef.value) {
      containerHeight.value = containerRef.value.clientHeight
    }
  }

  onMounted(() => {
    updateContainerHeight()
    window.addEventListener('resize', updateContainerHeight)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateContainerHeight)
  })

  return {
    visibleRange,
    totalHeight,
    offsetY,
    handleScroll,
    scrollToIndex,
    scrollTop,
    isNearBottom,
  }
}

