<template>
  <n-modal v-model:show="localShowModal">
    <n-card :bordered="false" size="huge" role="dialog" aria-modal="true" style="width: 600px">
      <n-spin :show="isUploading || isProcessing" :content-stylex="{ opacity: 1 }">
        <n-upload
          directory-dnd
          accept=".csv"
          :max="1"
          :show-file-list="false"
          :custom-request="handleCustomUpload"
          @error="handleUploadError"
          @finish="handleUploadFinish"
        >
          <n-upload-dragger>
            <div class="mb-4">
              <n-icon size="48" :depth="3">
                <ArchiveBoxIcon />
              </n-icon>
            </div>
            <n-text>{{ t('upload.dragAndDrop') }}</n-text>

            <div class="mt-4">
              <n-progress
                v-if="progress > 0"
                type="line"
                :percentage="progress"
                :indicator-placement="'inside'"
                :processing="isProcessing"
                class="mt-4"
              />
              <NText v-if="sseMessage" class="mt-2 text-sm">
                {{ sseMessage }}
              </NText>
            </div>
          </n-upload-dragger>
        </n-upload>

        <div class="mt-4 pt-4 border-t border-gray-200">
          <n-text class="text-xs">
            Перевірте, щоб назви колонок відповідали наступним:

            <div class="flex mt-2">
              <div class="w-1/2 text-left">
                <div>1. from_des</div>
                <div>2. to_des</div>
                <div>3. wire_code</div>
                <div>4. color_code</div>
                <div>5. note_code</div>
                <div>6. io_type</div>
                <div>7. sub</div>
              </div>
              <div class="w-1/2 text-left">
                <div>8. word</div>
                <div>9. bit</div>
                <div>10. remarks</div>
                <div>11. power</div>
                <div>12. origin</div>
                <div>13. ped</div>
                <div>14. write_data</div>
              </div>
            </div>
          </n-text>
        </div>

        <NCollapse class="mt-4 pt-6 border-t border-gray-200">
          <NCollapseItem :title="t('upload.optionsTitle')" name="1">
            <div class="flex items-center">
              <NSwitch size="medium" v-model:value="isDeleteAllInList" />
              <span class="ml-2">{{ t('upload.options.deleteAllInList') }}</span>
            </div>
          </NCollapseItem>
        </NCollapse>
      </n-spin>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NModal,
  NUpload,
  NUploadDragger,
  NIcon,
  NText,
  NP,
  NCard,
  NProgress,
  NSpin,
  useMessage,
  NSwitch,
  NCollapse,
  NCollapseItem,
  NLog,
  type UploadCustomRequestOptions,
} from 'naive-ui'
import { ArchiveBoxIcon } from '@heroicons/vue/24/solid'
import { uploadFile } from '@/api/upload'
import { useSSE } from '@/services/sseService'

const props = defineProps<{
  showModal: boolean
}>()

const { t } = useI18n()
const message = useMessage()

const {
  connect,
  disconnect,
  resumeConnection,
  clearMessages,
  progress,
  message: sseMessage,
  messageLog: sseMessageLog,
  isProcessing,
  currentProcessId,
  status,
} = useSSE()

const localShowModal = ref(props.showModal)
const isUploading = ref(false)
const isDeleteAllInList = ref(false)

const emit = defineEmits<{
  (e: 'update:showModal', value: boolean): void
  (e: 'update:upload-success'): void
}>()

watch(
  () => props.showModal,
  (newValue) => {
    localShowModal.value = newValue

    if (!localShowModal.value) {
      clearMessages()
    }
  },
)

watch(status, (newValue) => {
  if (newValue === 'COMPLETED') {
    emit('update:upload-success')
  }

  if (newValue === 'ERROR') {
    message.error(t('upload.error'))
  }
})

watch(localShowModal, (newValue) => {
  emit('update:showModal', newValue)
})

onMounted(() => {
  if (currentProcessId.value) {
    resumeConnection()
  }
})

const handleCustomUpload = async (options: UploadCustomRequestOptions) => {
  isUploading.value = true

  try {
    const processId = await uploadFile(options.file.file as File, {
      isDeleteAllInList: isDeleteAllInList.value,
    })

    options.onFinish()

    if (processId) {
      connect(processId)
    }
  } catch (error) {
    options.onError()
    isUploading.value = false
    isProcessing.value = false
    message.error(t('upload.error'))
  }
}

const handleUploadFinish = () => {
  isUploading.value = false
}

const handleUploadError = () => {
  isUploading.value = false
  message.error(t('upload.error'))
}

onUnmounted(() => {
  disconnect()
})
</script>
