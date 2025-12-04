<template>
  <div class="h-screen">
    <n-layout has-sider>
      <n-layout-sider
        bordered
        collapse-mode="width"
        :collapsed-width="64"
        :width="240"
        :collapsed="collapsed"
        show-trigger
        @collapse="handleCollapse(true)"
        @expand="handleCollapse(false)"
      >
        <Sidebar :collapsed="collapsed" />
      </n-layout-sider>
      <n-layout>
        <div class="overflow-hidden">
          <Header />
          <div class="p-4 overflow-y-auto scroll-container">
            <slot />
          </div>
        </div>
      </n-layout>
    </n-layout>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NLayout, NLayoutSider } from 'naive-ui'
import Header from './Header.vue'
import Sidebar from './Sidebar.vue'

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

const collapsed = ref(false)

// Initialize collapsed state from localStorage
onMounted(() => {
  const savedState = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
  if (savedState !== null) {
    collapsed.value = JSON.parse(savedState)
  }
})

// Handle collapse state change and save to localStorage
const handleCollapse = (isCollapsed: boolean) => {
  collapsed.value = isCollapsed
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(isCollapsed))
}
</script>

<style scoped>
.scroll-container {
  height: calc(100vh - 77px);
  overflow-y: auto;
}
</style>
