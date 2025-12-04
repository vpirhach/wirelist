<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-900"
  >
    <div class="w-full max-w-md space-y-8">
      <div>
        <div class="flex flex-col items-center justify-center">
          <img src="/images/logo/logo.png" alt="Wirelist" class="h-24 w-auto" />
          <span class="mt-4 text-xl font-bold">{{ $t('app.name') }}</span>
        </div>
        <h2
          class="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white"
        >
          {{ $t('auth.register.title') }}
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {{ $t('auth.register.subtitle') }}
          <router-link
            to="/login"
            class="font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
          >
            {{ $t('auth.register.signInExisting') }}
          </router-link>
        </p>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleRegister">
        <!-- Alert for errors -->
        <div v-if="authStore.error" class="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-red-800 dark:text-red-200">
                {{ authStore.error }}
              </p>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label for="username" class="sr-only">{{ $t('auth.register.username') }}</label>
            <input
              id="username"
              v-model="formData.username"
              name="username"
              type="text"
              autocomplete="username"
              required
              :disabled="authStore.loading"
              class="relative block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-brand-500 focus:outline-none focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 dark:focus:border-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
              :placeholder="$t('auth.register.username')"
              @input="authStore.clearError"
            />
            <p v-if="errors.username" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ errors.username }}
            </p>
          </div>

          <div>
            <label for="firstName" class="sr-only">{{ $t('auth.register.firstName') }}</label>
            <input
              id="firstName"
              v-model="formData.firstName"
              name="firstName"
              type="text"
              autocomplete="given-name"
              :disabled="authStore.loading"
              class="relative block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-brand-500 focus:outline-none focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 dark:focus:border-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
              :placeholder="$t('auth.register.firstName')"
              @input="authStore.clearError"
            />
            <p v-if="errors.firstName" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ errors.firstName }}
            </p>
          </div>

          <div>
            <label for="lastName" class="sr-only">{{ $t('auth.register.lastName') }}</label>
            <input
              id="lastName"
              v-model="formData.lastName"
              name="lastName"
              type="text"
              autocomplete="family-name"
              :disabled="authStore.loading"
              class="relative block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-brand-500 focus:outline-none focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 dark:focus:border-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
              :placeholder="$t('auth.register.lastName')"
              @input="authStore.clearError"
            />
            <p v-if="errors.lastName" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ errors.lastName }}
            </p>
          </div>

          <div>
            <label for="password" class="sr-only">{{ $t('auth.register.password') }}</label>
            <div class="relative">
              <input
                id="password"
                v-model="formData.password"
                name="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                required
                :disabled="authStore.loading"
                class="relative block w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-brand-500 focus:outline-none focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 dark:focus:border-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
                :placeholder="$t('auth.register.password')"
                @input="authStore.clearError"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 flex items-center pr-3"
                @click="showPassword = !showPassword"
              >
                <svg
                  v-if="!showPassword"
                  class="h-5 w-5 text-gray-400 hover:text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <svg
                  v-else
                  class="h-5 w-5 text-gray-400 hover:text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
              </button>
            </div>
            <p v-if="errors.password" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ errors.password }}
            </p>
          </div>

          <div>
            <label for="confirmPassword" class="sr-only">{{
              $t('auth.register.confirmPassword')
            }}</label>
            <div class="relative">
              <input
                id="confirmPassword"
                v-model="formData.confirmPassword"
                name="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                autocomplete="new-password"
                required
                :disabled="authStore.loading"
                class="relative block w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-brand-500 focus:outline-none focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 dark:focus:border-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
                :placeholder="$t('auth.register.confirmPassword')"
                @input="authStore.clearError"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 flex items-center pr-3"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <svg
                  v-if="!showConfirmPassword"
                  class="h-5 w-5 text-gray-400 hover:text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <svg
                  v-else
                  class="h-5 w-5 text-gray-400 hover:text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
              </button>
            </div>
            <p v-if="errors.confirmPassword" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ errors.confirmPassword }}
            </p>
          </div>

          <div>
            <label for="role" class="sr-only">{{ $t('auth.register.role') }}</label>
            <select
              id="role"
              v-model="formData.role"
              name="role"
              :disabled="authStore.loading"
              class="relative block w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:z-10 focus:border-brand-500 focus:outline-none focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
              @change="authStore.clearError"
            >
              <option value="">{{ $t('auth.register.selectRole') }}</option>
              <option value="USER">{{ $t('auth.register.roleUser') }}</option>
              <option value="ADMIN">{{ $t('auth.register.roleAdmin') }}</option>
            </select>
            <p v-if="errors.role" class="mt-1 text-sm text-red-600 dark:text-red-400">
              {{ errors.role }}
            </p>
          </div>
        </div>

        <div class="flex items-center">
          <input
            id="terms"
            v-model="formData.agreeToTerms"
            name="terms"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
          />
          <label for="terms" class="ml-2 block text-sm text-gray-900 dark:text-gray-300">
            {{ $t('auth.register.agreeToTerms') }}
            <a href="#" class="font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400">
              {{ $t('auth.register.termsAndConditions') }}
            </a>
          </label>
        </div>

        <div>
          <Button
            type="submit"
            :disabled="authStore.loading || !isFormValid"
            class="group relative flex w-full justify-center"
            size="md"
            variant="primary"
          >
            <span v-if="authStore.loading" class="mr-2">
              <svg
                class="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </span>
            {{
              authStore.loading
                ? $t('auth.register.creatingAccount')
                : $t('auth.register.createAccount')
            }}
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import Button from '@/components/Button.vue'
import type { RegisterCredentials } from '@/types/auth'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const formData = ref<
  RegisterCredentials & {
    confirmPassword: string
    agreeToTerms: boolean
    firstName: string
    lastName: string
  }
>({
  username: '',
  firstName: '',
  lastName: '',
  password: '',
  confirmPassword: '',
  role: undefined,
  agreeToTerms: false,
})

const errors = ref({
  username: '',
  firstName: '',
  lastName: '',
  password: '',
  confirmPassword: '',
  role: '',
})

const isFormValid = computed(() => {
  return (
    formData.value.username.trim() !== '' &&
    formData.value.password.trim() !== '' &&
    formData.value.confirmPassword.trim() !== '' &&
    formData.value.password === formData.value.confirmPassword &&
    formData.value.agreeToTerms
  )
})

const validateForm = () => {
  errors.value = {
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    role: '',
  }

  if (!formData.value.username.trim()) {
    errors.value.username = t('auth.validation.usernameRequired')
  } else if (formData.value.username.length < 3) {
    errors.value.username = t('auth.validation.usernameMinLength')
  }

  // Optional firstName validation
  if (formData.value.firstName && formData.value.firstName.length < 2) {
    errors.value.firstName = t('auth.validation.firstNameMinLength')
  }

  // Optional lastName validation
  if (formData.value.lastName && formData.value.lastName.length < 2) {
    errors.value.lastName = t('auth.validation.lastNameMinLength')
  }

  if (!formData.value.password.trim()) {
    errors.value.password = t('auth.validation.passwordRequired')
  } else if (formData.value.password.length < 4) {
    errors.value.password = t('auth.validation.passwordMinLength')
  }

  if (!formData.value.confirmPassword.trim()) {
    errors.value.confirmPassword = t('auth.validation.confirmPasswordRequired')
  } else if (formData.value.password !== formData.value.confirmPassword) {
    errors.value.confirmPassword = t('auth.validation.passwordsDoNotMatch')
  }

  return (
    !errors.value.username &&
    !errors.value.firstName &&
    !errors.value.lastName &&
    !errors.value.password &&
    !errors.value.confirmPassword
  )
}

const handleRegister = async () => {
  if (!validateForm()) {
    return
  }

  try {
    await authStore.register({
      username: formData.value.username,
      firstName: formData.value.firstName,
      lastName: formData.value.lastName,
      password: formData.value.password,
      role: formData.value.role,
    })

    // Redirect to home or dashboard
    router.push('/')
  } catch (error) {
    console.error('Registration failed:', error)
    // Error is handled by the store
  }
}

onMounted(() => {
  // Clear any existing errors when component mounts
  authStore.clearError()
})
</script>
