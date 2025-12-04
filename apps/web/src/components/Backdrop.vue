<template>
  <div v-if="isMobileOpen" class="fixed inset-0 bg-gray-900 bg-opacity-50 z-9999 lg:hidden"
    @click="toggleMobileSidebar"></div>
</template>

<script setup lang="ts">
import { useSidebarStore } from '@/stores/sidebar'
const { toggleMobileSidebar, isMobileOpen } = useSidebarStore()
</script>
