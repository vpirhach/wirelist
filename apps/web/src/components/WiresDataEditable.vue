<template>
  <div class="relative group">
    <!-- Editable Input (Absolutely Positioned) -->
    <NInputGroup
      v-if="isEditing"
      class="absolute left-0 top-0 z-50 shadow-lg"
      :style="{ minWidth: inputWidth + 'px' }"
    >
      <NInput
        ref="inputRef"
        v-model:value="editingValue"
        size="small"
        @blur="handleBlur"
        @keydown="handleKeydown"
        @input="updateInputWidth"
      />
      <NButton size="small" type="primary" @click="save">
        <template #icon>
          <CheckIcon />
        </template>
      </NButton>
      <NButton size="small" type="error" @click="cancel">
        <template #icon>
          <XMarkIcon />
        </template>
      </NButton>
    </NInputGroup>

    <!-- Display Value -->
    <span
      class="cursor-pointer group-hover:bg-blue-50 group-hover:text-blue-600 px-2 py-1 rounded transition-colors inline-flex items-center gap-1"
      :title="'Double-click to edit'"
      @dblclick="startEdit"
    >
      <!-- Show updated values differently -->
      <span v-if="hasUpdate" class="inline-flex flex-col gap-0.5">
        <span v-if="updateInfo?.oldValue" class="line-through text-red-500 text-xs">
          {{ updateInfo?.oldValue }}
        </span>
        <span class="text-green-600 font-medium">{{ updateInfo?.newValue }}</span>
      </span>
      <span v-else>{{ displayValue }}</span>
      <PencilIcon
        class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-blue-500"
        @click.stop="startEdit"
      />
    </span>

    <!-- Hidden span for width calculation -->
    <span ref="measureRef" class="invisible fixed whitespace-nowrap text-sm px-3 py-1">
      {{ editingValue }}
    </span>

    <!-- Confirmation Dialog for Edit Mode -->
    <NModal v-model:show="showConfirmDialog" preset="dialog" title="Confirm Edit">
      <template #default>
        <p>Do you want to edit this value?</p>
        <p class="mt-2 text-gray-600">
          Current value: <strong>{{ displayValue }}</strong>
        </p>
      </template>
      <template #action>
        <NSpace justify="end">
          <NButton @click="cancelConfirmation">Cancel</NButton>
          <NButton type="primary" @click="confirmEdit">Confirm</NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- Save/Cancel Dialog on Blur -->
    <NModal v-model:show="showSaveDialog" preset="dialog" title="Save Changes?">
      <template #default>
        <p>You have unsaved changes. Do you want to save them?</p>
      </template>
      <template #action>
        <NSpace justify="end">
          <NButton @click="discardChanges">Discard</NButton>
          <NButton type="primary" @click="saveChanges">Save</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import { NButton, NModal, NSpace, NInput, NInputGroup } from 'naive-ui'
import { CheckIcon, XMarkIcon, PencilIcon } from '@heroicons/vue/24/solid'

interface UpdateInfo {
  newValue: any
  oldValue: any
}

interface Props {
  value: any
  hasUpdate?: boolean
  updateInfo?: UpdateInfo | null
}

const props = withDefaults(defineProps<Props>(), {
  hasUpdate: false,
  updateInfo: null,
})

const emit = defineEmits<{
  'update:value': [value: any]
  'value-updated': [newValue: any, oldValue: any]
}>()

// Session state - persists across all component instances
const hasConfirmedEditOnce = ref(sessionStorage.getItem('wiresDataEditConfirmed') === 'true')

// Edit state
const isEditing = ref(false)
const editingValue = ref<string>('')
const originalValue = ref<string>('')
const showConfirmDialog = ref(false)
const showSaveDialog = ref(false)
const inputRef = ref<any>(null)
const measureRef = ref<HTMLElement | null>(null)
const inputWidth = ref(200) // Default minimum width

const displayValue = computed(() => {
  return props.value?.toString() || ''
})

const updateInputWidth = async () => {
  await nextTick()
  if (measureRef.value) {
    // Get the actual width of the text + padding for buttons (approximately 100px for two buttons)
    const textWidth = measureRef.value.offsetWidth
    const buttonsWidth = 100
    const minWidth = 200
    inputWidth.value = Math.max(textWidth + buttonsWidth, minWidth)
  }
}

const startEdit = () => {
  // Check if user has already confirmed once in this session
  if (hasConfirmedEditOnce.value) {
    // Skip confirmation and go directly to edit mode
    confirmEdit()
  } else {
    // Show confirmation dialog for the first time
    showConfirmDialog.value = true
  }
}

const confirmEdit = async () => {
  showConfirmDialog.value = false

  // Mark as confirmed in session storage
  if (!hasConfirmedEditOnce.value) {
    hasConfirmedEditOnce.value = true
    sessionStorage.setItem('wiresDataEditConfirmed', 'true')
  }

  isEditing.value = true
  editingValue.value = displayValue.value
  originalValue.value = displayValue.value

  await nextTick()

  // Update input width to fit content
  await updateInputWidth()

  // Focus and select the input
  if (inputRef.value) {
    inputRef.value.focus()
    inputRef.value.select()
  }
}

const cancelConfirmation = () => {
  showConfirmDialog.value = false
}

const save = () => {
  if (!isEditing.value) return

  const newValue = editingValue.value.trim()

  if (newValue !== originalValue.value) {
    const oldValue = originalValue.value
    emit('update:value', newValue)
    emit('value-updated', newValue, oldValue)
  }

  isEditing.value = false
  editingValue.value = ''
  originalValue.value = ''
}

const cancel = () => {
  isEditing.value = false
  editingValue.value = ''
  originalValue.value = ''
  showSaveDialog.value = false
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    save()
  } else if (event.key === 'Escape') {
    cancel()
  }
}

const handleBlur = () => {
  // Delay to allow button clicks to register before blur closes the input
  setTimeout(() => {
    // Only handle blur if still editing and no modal is shown
    if (!isEditing.value || showSaveDialog.value) return

    const currentValue = editingValue.value.trim()

    // If value changed, ask to save; otherwise just cancel
    if (currentValue !== originalValue.value) {
      showSaveDialog.value = true
    } else {
      cancel()
    }
  }, 150)
}

const saveChanges = () => {
  save()
  showSaveDialog.value = false
}

const discardChanges = () => {
  cancel()
}
</script>
