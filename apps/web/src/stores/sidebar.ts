import { ref, computed, onMounted, onUnmounted, provide, inject } from 'vue'
import type { Ref } from 'vue' //
import { defineStore } from 'pinia'

interface SidebarContextType {
  isExpanded: Ref<boolean>
  isMobileOpen: Ref<boolean>
  isHovered: Ref<boolean>
  activeItem: Ref<string | null>
  openSubmenu: Ref<string | null>
  toggleSidebar: () => void
  toggleMobileSidebar: () => void
  setIsHovered: (isHovered: boolean) => void
  setActiveItem: (item: string | null) => void
  toggleSubmenu: (item: string) => void
}

export const useSidebarStore = defineStore('sidebar', () => {
  const isExpanded = ref(true)
  const isMobileOpen = ref(false)
  const isMobile = ref(false)
  const isHovered = ref(false)
  const activeItem = ref<string | null>(null)
  const openSubmenu = ref<string | null>(null)

  const handleResize = () => {
    const mobile = window.innerWidth < 768
    isMobile.value = mobile
    if (!mobile) {
      isMobileOpen.value = false
    }
  }

  onMounted(() => {
    handleResize()
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })

  const toggleSidebar = () => {
    if (isMobile.value) {
      isMobileOpen.value = !isMobileOpen.value
    } else {
      isExpanded.value = !isExpanded.value
    }
  }

  const toggleMobileSidebar = () => {
    isMobileOpen.value = !isMobileOpen.value
  }

  const setIsHovered = (value: boolean) => {
    isHovered.value = value
  }

  const setActiveItem = (item: string | null) => {
    activeItem.value = item
  }

  const toggleSubmenu = (groupIndex: number, itemIndex: number) => {
    const key = `${groupIndex}-${itemIndex}`
    openSubmenu.value = openSubmenu.value === key ? null : key
  }

  return {
    isExpanded: computed(() => (isMobile.value ? false : isExpanded.value)),
    isMobileOpen,
    isHovered,
    activeItem,
    openSubmenu,
    toggleSidebar,
    toggleMobileSidebar,
    setIsHovered,
    setActiveItem,
    toggleSubmenu,
  }
})
