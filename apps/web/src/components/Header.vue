<template>
  <header class="sticky top-0 flex w-full bg-white border-b border-gray-200 z-10">
    <div class="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
      <div
        class="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4"
      >
        <SearchBar />

        <div class="flex items-center gap-2 border-l border-gray-200 pl-4">
          <NButton variant="primary" class-name="whitespace-nowrap" @click="openWireDetails">
            {{ t('buttons.create') }}
          </NButton>

          <NButton variant="primary" class-name="whitespace-nowrap" @click="showModal = true">
            {{ t('buttons.upload') }}
            <ArrowUpTrayIcon class="w-4 h-4 ml-2" />
          </NButton>
        </div>
      </div>

      <div class="flex items-center w-full gap-4 px-5 py-4 justify-end px-0">
        <div class="flex items-center gap-2 2xsm:gap-3">
          <LanguageSwitcher />
          <NotificationMenu />
        </div>
        <UserMenu />
      </div>

      <FileUpload
        :show-modal="showModal"
        @update:show-modal="showModal = $event"
        @update:upload-success="handleUploadSuccess"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, h, type Component } from 'vue'
import { useSidebarStore } from '@/stores/sidebar'
import { NMenu, NIcon } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import SearchBar from './SearchBar.vue'
import NotificationMenu from './NotificationMenu.vue'
import UserMenu from './UserMenu.vue'
import { NButton } from 'naive-ui'
import LanguageSwitcher from './LanguageSwitcher.vue'
import { useWireDetailsStore } from '@/stores/wireDetails'
import { ArrowUpTrayIcon } from '@heroicons/vue/24/solid'
import { ClipboardDocumentListIcon, PencilSquareIcon } from '@heroicons/vue/24/outline'
import FileUpload from './FileUpload.vue'
import { useWiresStore } from '@/stores/wires'

const { t } = useI18n()
const { toggleSidebar, toggleMobileSidebar, isMobileOpen } = useSidebarStore()
const wireDetailsStore = useWireDetailsStore()
const { refetch } = useWiresStore()

const handleToggle = () => {
  if (window.innerWidth >= 991) {
    toggleSidebar()
  } else {
    toggleMobileSidebar()
  }
}

const dropdownOpen = ref(false)
const notifying = ref(false)
const showModal = ref(false)

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
  notifying.value = false
}

const isApplicationMenuOpen = ref(false)

const toggleApplicationMenu = () => {
  isApplicationMenuOpen.value = !isApplicationMenuOpen.value
}

const openWireDetails = () => {
  wireDetailsStore.openDetails()
}

const handleUploadSuccess = () => {
  refetch()
  showModal.value = false
}
</script>
