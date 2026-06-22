<template>
  <n-modal
    v-model:show="localShowModal"
    :style="{ width: 'min(96vw, 960px)' }"
    preset="card"
    :title="step === 'select' ? t('upload.loomTitle') : t('upload.previewTitle')"
    :bordered="false"
    size="huge"
    role="dialog"
    aria-modal="true"
  >
    <n-spin :show="isLoading">
      <!-- Step 1: pick files -->
      <div v-if="step === 'select'" class="space-y-4">
        <n-text depth="3">
          {{ t('upload.loomHint') }}
        </n-text>

        <div
          class="border border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50"
          @click="fileInputRef?.click()"
          @dragover.prevent
          @drop.prevent="onDrop"
        >
          <input
            ref="fileInputRef"
            type="file"
            class="hidden"
            multiple
            accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            @change="onNativeFileChange"
          />
          <n-icon size="48" :depth="3">
            <ArchiveBoxIcon />
          </n-icon>
          <div class="mt-2">{{ t('upload.dragAndDrop') }}</div>
          <n-text v-if="pickedFiles.length" class="block mt-3 text-sm">
            {{ t('upload.filesSelected', { n: pickedFiles.length }) }}
          </n-text>
        </div>

        <ul v-if="pickedFiles.length" class="text-sm text-left max-h-40 overflow-auto list-disc pl-5">
          <li v-for="(f, i) in pickedFiles" :key="i">{{ f.name }} ({{ (f.size / 1024).toFixed(1) }} KB)</li>
        </ul>

        <div class="flex items-center gap-2">
          <n-switch v-model:value="skipDeletes" size="medium" />
          <span class="text-sm">{{ t('upload.skipDeletes') }}</span>
        </div>

        <div v-if="!skipDeletes" class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <n-switch v-model:value="fullSyncDeletes" size="medium" />
            <span class="text-sm">{{ t('upload.fullSyncDeletes') }}</span>
          </div>
          <n-text depth="3" class="text-xs pl-10">{{ t('upload.fullSyncDeletesHint') }}</n-text>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <n-button @click="closeModal">{{ t('upload.cancel') }}</n-button>
          <n-button type="primary" :disabled="pickedFiles.length === 0" @click="runPreview">
            {{ t('upload.analyze') }}
          </n-button>
        </div>
      </div>

      <!-- Step 2: preview -->
      <div v-else class="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <n-alert v-if="collisionWarnings.length" type="warning" :title="t('upload.warnings')">
          <ul class="list-disc pl-4 text-sm">
            <li v-for="(w, i) in collisionWarnings" :key="i">{{ w }}</li>
          </ul>
        </n-alert>

        <n-text class="block text-sm">
          {{
            t('upload.summaryLine', {
              added: preview?.summary.added ?? 0,
              edited: preview?.summary.edited ?? 0,
              deleted: preview?.summary.deleted ?? 0,
            })
          }}
        </n-text>

        <n-input
          v-model:value="comment"
          type="textarea"
          :placeholder="t('upload.commentPlaceholder')"
          :autosize="{ minRows: 2, maxRows: 4 }"
        />

        <div class="flex flex-wrap gap-2">
          <n-button size="small" @click="selectAll(true)">{{ t('upload.selectAll') }}</n-button>
          <n-button size="small" @click="selectAll(false)">{{ t('upload.selectNone') }}</n-button>
          <n-button size="small" quaternary @click="step = 'select'">{{ t('upload.back') }}</n-button>
        </div>

        <div v-for="section in previewSections" :key="section.key" class="border border-gray-200 rounded-md overflow-hidden">
          <div class="bg-gray-100 px-3 py-2 font-medium text-sm">
            {{ section.label }} ({{ section.items.length }})
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-xs border-collapse">
              <thead>
                <tr class="border-b border-gray-200 bg-white">
                  <th class="p-2 w-10 text-left">
                    <n-checkbox
                      :checked="sectionAllSelected(section)"
                      :indeterminate="sectionIndeterminate(section)"
                      @update:checked="(v: boolean) => selectSection(section.key, v)"
                    />
                  </th>
                  <th class="p-2 text-left">{{ t('upload.colRoute') }}</th>
                  <th class="p-2 text-left">{{ t('upload.colDetail') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in section.items" :key="item.id" class="border-b border-gray-100 align-top">
                  <td class="p-2">
                    <n-checkbox
                      :checked="included[item.id] !== false"
                      @update:checked="(v: boolean) => (included[item.id] = v)"
                    />
                  </td>
                  <td class="p-2 font-mono whitespace-pre-wrap">
                    {{ item.fromDestination }} → {{ item.toDestination }}
                    <span v-if="item.wireId" class="block text-gray-500">id: {{ item.wireId }}</span>
                  </td>
                  <td class="p-2">
                    <div v-if="item.warnings?.length" class="text-amber-700 mb-1">
                      {{ item.warnings.join(' ') }}
                    </div>
                    <template v-if="item.action === 'UPDATE' && item.record.changes">
                      <span class="whitespace-pre-wrap">{{ formatFieldChanges(item.record.changes) }}</span>
                    </template>
                    <template v-else-if="item.action === 'CREATE'">
                      {{ summarizeCreate(item) }}
                    </template>
                    <template v-else>
                      <span class="text-gray-500">{{ t('upload.deleteHint') }}</span>
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <n-button @click="closeModal">{{ t('upload.cancel') }}</n-button>
          <n-button
            type="primary"
            :disabled="selectedCount === 0 || isSubmitting"
            :loading="isSubmitting"
            @click="submitPreview"
          >
            {{ t('upload.submitChangeRequest', { n: selectedCount }) }}
          </n-button>
        </div>
      </div>
    </n-spin>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NModal,
  NButton,
  NSpin,
  NText,
  NIcon,
  NCheckbox,
  NInput,
  NAlert,
  NSwitch,
  useMessage,
} from 'naive-ui'
import { ArchiveBoxIcon } from '@heroicons/vue/24/solid'
import {
  previewLoomUpload,
  submitLoomPreview,
  formatFieldChanges,
  type LoomPreviewResponse,
  type LoomPreviewItem,
} from '@/api/loomUpload'

const props = defineProps<{
  showModal: boolean
}>()

const { t } = useI18n()
const message = useMessage()

const emit = defineEmits<{
  (e: 'update:showModal', value: boolean): void
  (e: 'update:upload-success'): void
}>()

const localShowModal = ref(props.showModal)
const step = ref<'select' | 'preview'>('select')
const fileInputRef = ref<HTMLInputElement | null>(null)
const pickedFiles = ref<File[]>([])
const skipDeletes = ref(false)
/** When true, DELETE any DB route not in file. Default false = only delete within file from-destinations. */
const fullSyncDeletes = ref(false)
const isLoading = ref(false)
const isSubmitting = ref(false)
const preview = ref<LoomPreviewResponse | null>(null)
const collisionWarnings = ref<string[]>([])
const included = ref<Record<string, boolean>>({})
const comment = ref('')

watch(
  () => props.showModal,
  (v) => {
    localShowModal.value = v
    if (!v) resetState()
  },
)

watch(localShowModal, (v) => {
  emit('update:showModal', v)
})

function resetState() {
  step.value = 'select'
  pickedFiles.value = []
  preview.value = null
  collisionWarnings.value = []
  included.value = {}
  comment.value = ''
  skipDeletes.value = false
  fullSyncDeletes.value = false
}

function onNativeFileChange(e: Event) {
  const el = e.target as HTMLInputElement
  if (!el.files?.length) return
  pickedFiles.value = Array.from(el.files)
}

function onDrop(e: DragEvent) {
  const dt = e.dataTransfer
  if (!dt?.files?.length) return
  pickedFiles.value = Array.from(dt.files).filter(
    (f) => f.name.toLowerCase().endsWith('.doc') || f.name.toLowerCase().endsWith('.docx'),
  )
}

function closeModal() {
  localShowModal.value = false
}

const previewSections = computed(() => {
  const p = preview.value
  if (!p) return [] as { key: LoomPreviewItem['action']; label: string; items: LoomPreviewItem[] }[]
  const map = {
    CREATE: [] as LoomPreviewItem[],
    UPDATE: [] as LoomPreviewItem[],
    DELETE: [] as LoomPreviewItem[],
  }
  for (const it of p.items) {
    map[it.action].push(it)
  }
  return [
    { key: 'CREATE' as const, label: t('upload.sectionAdded'), items: map.CREATE },
    { key: 'UPDATE' as const, label: t('upload.sectionEdited'), items: map.UPDATE },
    { key: 'DELETE' as const, label: t('upload.sectionDeleted'), items: map.DELETE },
  ].filter((s) => s.items.length > 0)
})

const selectedCount = computed(() => {
  if (!preview.value) return 0
  return preview.value.items.filter((i) => included.value[i.id] !== false).length
})

function summarizeCreate(item: LoomPreviewItem): string {
  const r = item.record
  const parts = [
    r.wireNumber && `wire# ${r.wireNumber}`,
    r.wireCodeId != null && `code ${r.wireCodeId}`,
    r.colorId != null && `color ${r.colorId}`,
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : t('upload.createMinimal')
}

async function runPreview() {
  if (!pickedFiles.value.length) return
  isLoading.value = true
  try {
    const res = await previewLoomUpload(pickedFiles.value, {
      skipDeletes: skipDeletes.value,
      fullSyncDeletes: fullSyncDeletes.value,
    })
    preview.value = res
    collisionWarnings.value = res.collisionWarnings || []
    const inc: Record<string, boolean> = {}
    for (const it of res.items) {
      inc[it.id] = true
    }
    included.value = inc
    step.value = 'preview'
    if (res.items.length === 0) {
      message.warning(t('upload.noChanges'))
    }
  } catch (e: unknown) {
    console.error(e)
    message.error(t('upload.error'))
  } finally {
    isLoading.value = false
  }
}

function selectAll(v: boolean) {
  if (!preview.value) return
  const next: Record<string, boolean> = {}
  for (const it of preview.value.items) {
    next[it.id] = v
  }
  included.value = next
}

function selectSection(action: LoomPreviewItem['action'], v: boolean) {
  if (!preview.value) return
  const next = { ...included.value }
  for (const it of preview.value.items) {
    if (it.action === action) next[it.id] = v
  }
  included.value = next
}

function sectionAllSelected(section: { key: LoomPreviewItem['action']; items: LoomPreviewItem[] }) {
  if (!section.items.length) return false
  return section.items.every((i) => included.value[i.id] !== false)
}

function sectionIndeterminate(section: { key: LoomPreviewItem['action']; items: LoomPreviewItem[] }) {
  const sel = section.items.filter((i) => included.value[i.id] !== false).length
  return sel > 0 && sel < section.items.length
}

async function submitPreview() {
  if (!preview.value || selectedCount.value === 0) return
  isSubmitting.value = true
  try {
    const selectedIds = preview.value.items
      .filter((i) => included.value[i.id] !== false)
      .map((i) => i.id)
    await submitLoomPreview({
      previewId: preview.value.previewId,
      selectedItemIds: selectedIds,
      comment: comment.value.trim() || undefined,
    })
    message.success(t('upload.submitSuccess'))
    emit('update:upload-success')
    localShowModal.value = false
  } catch (e) {
    console.error(e)
    message.error(t('upload.submitFailed'))
  } finally {
    isSubmitting.value = false
  }
}
</script>
