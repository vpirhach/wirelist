<template>
  <div class="relative" ref="dropdownRef">
    <button
      class="flex items-center text-gray-700 dark:text-gray-400"
      @click.prevent="toggleDropdown"
    >
      <span
        class="mr-3 overflow-hidden rounded-full border border-gray-200 text-xl leading-10 h-11 w-11"
      >
        {{ logoLetters }}
      </span>

      <span class="block mr-1 font-medium text-theme-sm">{{ currentUser?.firstName }}</span>

      <ChevronDownIcon :class="{ 'rotate-180': dropdownOpen }" />
    </button>

    <!-- Dropdown Start -->
    <div
      v-if="dropdownOpen"
      class="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
    >
      <div>
        <span class="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
          {{ currentUser.fullName }}
        </span>
        <span class="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
          {{ currentUser.role }}
        </span>
      </div>
      <router-link
        to="login"
        @click="signOut"
        class="flex items-center gap-3 px-3 py-2 mt-3 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
      >
        <LogoutIcon
          class="text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
        />
        {{ t('auth.menu.signOut') }}
      </router-link>
    </div>
    <!-- Dropdown End -->
  </div>
</template>

<script setup>
import { UserCircleIcon, ChevronDownIcon, LogoutIcon, SettingsIcon, InfoCircleIcon } from '@/icons'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const authStore = useAuthStore()
const { currentUser } = storeToRefs(authStore)

const dropdownOpen = ref(false)
const dropdownRef = ref(null)

const menuItems = [
  { href: '/profile', icon: UserCircleIcon, text: 'Edit profile' },
  { href: '/chat', icon: SettingsIcon, text: 'Account settings' },
  { href: '/profile', icon: InfoCircleIcon, text: 'Support' },
]

const logoLetters = computed(() => {
  console.log(currentUser.value)
  if (currentUser.value?.firstName && currentUser.value?.lastName) {
    return currentUser.value.firstName.charAt(0) + currentUser.value.lastName.charAt(0)
  }
  return 'U'
})

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
}

const closeDropdown = () => {
  dropdownOpen.value = false
}

const signOut = () => {
  authStore.logout()
  closeDropdown()
}

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)

  console.log(currentUser.value)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
