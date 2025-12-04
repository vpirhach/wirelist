<template>
  <div class="grid grid-cols-12 gap-4 md:gap-6">
    <div class="col-span-12">
      <div class="mb-4">
        <h1 class="text-2xl font-bold text-gray-800 mb-2">{{ t('reviewUpdates.title') }}</h1>
        <p class="text-gray-600 text-sm">
          {{ t('reviewUpdates.description') }}
        </p>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-4 mb-4">
        <NSelect
          v-model:value="selectedUnit"
          :options="unitOptions"
          :placeholder="t('reviewUpdates.filterByUnit')"
          clearable
          style="width: 200px"
          @update:value="handleFilterChange"
        />
        <NSelect
          v-model:value="selectedStatus"
          :options="statusOptions"
          :placeholder="t('reviewUpdates.filterByStatus')"
          clearable
          style="width: 200px"
          @update:value="handleFilterChange"
        />
        <NButton @click="refreshData" :loading="isLoading">
          {{ t('reviewUpdates.refresh') }}
        </NButton>
      </div>

      <!-- Change Requests Table (Grouped by Batch) -->
      <div v-if="groupedRequests.length > 0" class="space-y-4">
        <div
          v-for="group in groupedRequests"
          :key="group.batchId || 'single'"
          class="bg-white rounded-lg shadow overflow-hidden"
        >
          <!-- Batch Header (only show if batch has multiple items) -->
          <div
            v-if="group.requests.length > 1"
            class="bg-gradient-to-r from-indigo-50 to-indigo-100 px-4 py-2 border-b flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold"
              >
                {{ group.requests.length }}
              </span>
              <span class="text-sm font-medium text-indigo-800">
                {{ t('reviewUpdates.batch') }}
                {{ t('reviewUpdates.changesBy', { count: group.requests.length }) }}
                {{ group.requests[0].author.fullName }}
              </span>
              <span class="text-xs text-indigo-600">
                {{ new Date(group.requests[0].createdAt).toLocaleString() }}
              </span>
            </div>
            <NSpace v-if="group.requests.some((r) => r.status === 'PENDING')" size="small">
              <NButton size="tiny" type="success" @click="handleApproveBatch(group)">
                {{ t('reviewUpdates.approveBatch') }}
              </NButton>
              <NButton size="tiny" type="warning" @click="handleDeclineBatch(group)">
                {{ t('reviewUpdates.declineBatch') }}
              </NButton>
              <NButton size="tiny" type="error" @click="handleRejectBatch(group)">
                {{ t('reviewUpdates.deleteBatch') }}
              </NButton>
            </NSpace>
          </div>

          <table class="w-full">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {{ t('reviewUpdates.table.status') }}
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {{ t('reviewUpdates.table.author') }}
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {{ t('reviewUpdates.table.wireId') }}
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {{ t('reviewUpdates.table.from') }}
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {{ t('reviewUpdates.table.to') }}
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {{ t('reviewUpdates.table.type') }}
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {{ t('reviewUpdates.table.changes') }}
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {{ t('reviewUpdates.table.date') }}
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {{ t('reviewUpdates.table.actions') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr
                v-for="request in group.requests"
                :key="request.id"
                class="hover:bg-gray-50"
                :class="{ 'bg-indigo-50/30': group.requests.length > 1 }"
              >
                <td class="px-4 py-3">
                  <span
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    :class="getStatusClass(request.status)"
                  >
                    {{ t(`updates.status.${request.status.toLowerCase()}`) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                  {{ request.author.fullName }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-500">
                  {{ request.wireId || t('reviewUpdates.new') }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                  {{ request.fromDestination || '-' }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                  {{ request.toDestination || '-' }}
                </td>
                <td class="px-4 py-3">
                  <span
                    class="px-2 py-1 text-xs font-medium rounded"
                    :class="{
                      'bg-green-100 text-green-800': request.requestType === 'CREATE',
                      'bg-blue-100 text-blue-800': request.requestType === 'UPDATE',
                      'bg-red-100 text-red-800': request.requestType === 'DELETE',
                    }"
                  >
                    {{ t(`reviewUpdates.requestType.${request.requestType.toLowerCase()}`) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm">
                  <div v-if="request.changes" class="max-w-xs">
                    <div v-for="(change, key) in request.changes" :key="key" class="text-xs">
                      <span class="font-medium">{{ key }}:</span>
                      <span class="text-red-500 line-through ml-1">{{ change.oldValue }}</span>
                      <span class="text-gray-400 mx-1">→</span>
                      <span class="text-green-600">{{ change.newValue }}</span>
                    </div>
                  </div>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500">
                  {{ new Date(request.createdAt).toLocaleDateString() }}
                </td>
                <td class="px-4 py-3">
                  <div v-if="request.status === 'PENDING'" class="flex items-center gap-1">
                    <NTooltip trigger="hover">
                      <template #trigger>
                        <button
                          class="p-1.5 rounded-full hover:bg-green-100 text-green-600 hover:text-green-700 transition-colors"
                          @click="handleApprove(request)"
                        >
                          <CheckIcon class="w-4 h-4" />
                        </button>
                      </template>
                      {{ t('reviewUpdates.approve') }}
                    </NTooltip>
                    <NTooltip trigger="hover">
                      <template #trigger>
                        <button
                          class="p-1.5 rounded-full hover:bg-yellow-100 text-yellow-600 hover:text-yellow-700 transition-colors"
                          @click="handleDecline(request)"
                        >
                          <XMarkIcon class="w-4 h-4" />
                        </button>
                      </template>
                      {{ t('reviewUpdates.decline') }}
                    </NTooltip>
                    <NTooltip trigger="hover">
                      <template #trigger>
                        <button
                          class="p-1.5 rounded-full hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors"
                          @click="handleReject(request)"
                        >
                          <TrashIcon class="w-4 h-4" />
                        </button>
                      </template>
                      {{ t('reviewUpdates.delete') }}
                    </NTooltip>
                  </div>
                  <div v-else class="text-xs text-gray-500">
                    <div v-if="request.reviewComment" class="italic">
                      "{{ request.reviewComment }}"
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!isLoading" class="text-center py-12 bg-white rounded-lg">
        <div class="text-gray-400 text-lg mb-2">{{ t('reviewUpdates.noChangeRequests') }}</div>
        <div class="text-gray-500 text-sm">{{ t('reviewUpdates.adjustFilters') }}</div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-12">
        <NSpin size="large" />
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-center mt-4">
        <NPagination
          v-model:page="currentPage"
          :page-count="totalPages"
          :page-size="pageSize"
          show-quick-jumper
          @update:page="handlePageChange"
        />
      </div>
    </div>

    <!-- Review Modal -->
    <NModal v-model:show="showReviewModal" preset="dialog" :title="reviewModalTitle">
      <div class="space-y-4">
        <p class="text-gray-600">
          {{ reviewModalDescription }}
        </p>
        <NInput
          v-model:value="reviewComment"
          type="textarea"
          :placeholder="t('reviewUpdates.addComment')"
          :rows="3"
        />
      </div>
      <template #action>
        <NSpace justify="end">
          <NButton @click="cancelReview">{{ t('reviewUpdates.cancel') }}</NButton>
          <NButton
            :type="pendingAction === 'approve' ? 'success' : 'warning'"
            :loading="isProcessing"
            @click="confirmReview"
          >
            {{
              pendingAction === 'approve' ? t('reviewUpdates.approve') : t('reviewUpdates.decline')
            }}
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  NButton,
  NSpace,
  NModal,
  NInput,
  NSelect,
  NPagination,
  NSpin,
  NTooltip,
  useMessage,
} from 'naive-ui'
import { CheckIcon, XMarkIcon, TrashIcon } from '@heroicons/vue/24/solid'
import { useI18n } from 'vue-i18n'
import {
  getAllChangeRequests,
  approveChangeRequest,
  declineChangeRequest,
  rejectChangeRequest,
  type ChangeRequest,
  type ChangeRequestStatus,
} from '@/api/changeRequests'
import { getUnits } from '@/api/unitsAndPanels'

const { t } = useI18n()
const message = useMessage()

// Batch group interface
interface BatchGroup {
  batchId: string | null
  requests: ChangeRequest[]
}

// Data
const changeRequests = ref<ChangeRequest[]>([])
const units = ref<string[]>([])

// Filters
const selectedUnit = ref<string | null>(null)
const selectedStatus = ref<ChangeRequestStatus | null>(null)

// Pagination
const currentPage = ref(1)
const pageSize = ref(50)
const totalElements = ref(0)
const totalPages = computed(() => Math.ceil(totalElements.value / pageSize.value))

// Loading state
const isLoading = ref(false)

// Review modal state
const showReviewModal = ref(false)
const reviewComment = ref('')
const pendingAction = ref<'approve' | 'decline' | null>(null)
const pendingRequest = ref<ChangeRequest | null>(null)
const pendingBatch = ref<BatchGroup | null>(null)
const isProcessing = ref(false)

// Group requests by batchId
const groupedRequests = computed<BatchGroup[]>(() => {
  const groups = new Map<string, ChangeRequest[]>()

  for (const request of changeRequests.value) {
    const key = request.batchId || `single-${request.id}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(request)
  }

  // Convert to array and sort by first request's date (newest first)
  return Array.from(groups.entries())
    .map(([batchId, requests]) => ({
      batchId: batchId.startsWith('single-') ? null : batchId,
      requests: requests.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    }))
    .sort(
      (a, b) =>
        new Date(b.requests[0].createdAt).getTime() - new Date(a.requests[0].createdAt).getTime(),
    )
})

// Options for select dropdowns
const unitOptions = computed(() => [...units.value.map((u) => ({ label: u, value: u }))])

const statusOptions = computed(() => [
  { label: t('updates.status.pending'), value: 'PENDING' },
  { label: t('updates.status.approved'), value: 'APPROVED' },
  { label: t('updates.status.declined'), value: 'DECLINED' },
])

const reviewModalTitle = computed(() => {
  if (!pendingAction.value) return ''

  if (pendingBatch.value) {
    const pendingCount = pendingBatch.value.requests.filter((r) => r.status === 'PENDING').length
    return pendingAction.value === 'approve'
      ? t('reviewUpdates.modal.approveBatch', { count: pendingCount })
      : t('reviewUpdates.modal.declineBatch', { count: pendingCount })
  }
  return pendingAction.value === 'approve'
    ? t('reviewUpdates.modal.approveRequest')
    : t('reviewUpdates.modal.declineRequest')
})

const reviewModalDescription = computed(() => {
  if (!pendingAction.value) return ''

  if (pendingBatch.value) {
    const pendingCount = pendingBatch.value.requests.filter((r) => r.status === 'PENDING').length
    return pendingAction.value === 'approve'
      ? t('reviewUpdates.modal.approveBatchDescription', { count: pendingCount })
      : t('reviewUpdates.modal.declineBatchDescription', { count: pendingCount })
  }
  return pendingAction.value === 'approve'
    ? t('reviewUpdates.modal.approveDescription')
    : t('reviewUpdates.modal.declineDescription')
})

/**
 * Fetch change requests with current filters and pagination
 */
const fetchChangeRequests = async () => {
  isLoading.value = true

  try {
    const response = await getAllChangeRequests(
      currentPage.value - 1, // API uses 0-based pages
      pageSize.value,
      selectedUnit.value || undefined,
      selectedStatus.value || undefined,
    )

    changeRequests.value = response.data.content
    totalElements.value = response.data.totalElements
  } catch (error) {
    console.error('Error fetching change requests:', error)
    message.error(t('reviewUpdates.messages.loadFailed'))
  } finally {
    isLoading.value = false
  }
}

/**
 * Fetch units for the filter dropdown
 */
const fetchUnits = async () => {
  try {
    units.value = await getUnits()
  } catch (error) {
    console.error('Error fetching units:', error)
  }
}

const refreshData = () => {
  fetchChangeRequests()
}

const handleFilterChange = () => {
  currentPage.value = 1
  fetchChangeRequests()
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchChangeRequests()
}

const getStatusClass = (status: ChangeRequestStatus): string => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800'
    case 'APPROVED':
      return 'bg-green-100 text-green-800'
    case 'DECLINED':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Single request actions
const handleApprove = (request: ChangeRequest) => {
  pendingAction.value = 'approve'
  pendingRequest.value = request
  pendingBatch.value = null
  reviewComment.value = ''
  showReviewModal.value = true
}

const handleDecline = (request: ChangeRequest) => {
  pendingAction.value = 'decline'
  pendingRequest.value = request
  pendingBatch.value = null
  reviewComment.value = ''
  showReviewModal.value = true
}

const handleReject = async (request: ChangeRequest) => {
  try {
    await rejectChangeRequest(request.id)
    message.success(t('reviewUpdates.messages.deleted'))
    fetchChangeRequests()
  } catch (error) {
    console.error('Error rejecting change request:', error)
    message.error(t('reviewUpdates.messages.deleteFailed'))
  }
}

// Batch actions
const handleApproveBatch = (group: BatchGroup) => {
  pendingAction.value = 'approve'
  pendingRequest.value = null
  pendingBatch.value = group
  reviewComment.value = ''
  showReviewModal.value = true
}

const handleDeclineBatch = (group: BatchGroup) => {
  pendingAction.value = 'decline'
  pendingRequest.value = null
  pendingBatch.value = group
  reviewComment.value = ''
  showReviewModal.value = true
}

const handleRejectBatch = async (group: BatchGroup) => {
  const pendingRequests = group.requests.filter((r) => r.status === 'PENDING')

  try {
    for (const request of pendingRequests) {
      await rejectChangeRequest(request.id)
    }
    message.success(t('reviewUpdates.messages.batchDeleted', { count: pendingRequests.length }))
    fetchChangeRequests()
  } catch (error) {
    console.error('Error rejecting batch:', error)
    message.error(t('reviewUpdates.messages.batchDeleteFailed'))
  }
}

const cancelReview = () => {
  showReviewModal.value = false
  pendingAction.value = null
  pendingRequest.value = null
  pendingBatch.value = null
  reviewComment.value = ''
}

const confirmReview = async () => {
  if (!pendingAction.value) return

  isProcessing.value = true

  try {
    if (pendingBatch.value) {
      // Batch action
      const pendingRequests = pendingBatch.value.requests.filter((r) => r.status === 'PENDING')
      let successCount = 0

      for (const request of pendingRequests) {
        try {
          if (pendingAction.value === 'approve') {
            await approveChangeRequest(request.id, reviewComment.value || undefined)
          } else {
            await declineChangeRequest(request.id, reviewComment.value || undefined)
          }
          successCount++
        } catch (e) {
          console.error(`Error processing request ${request.id}:`, e)
        }
      }

      if (pendingAction.value === 'approve') {
        message.success(t('reviewUpdates.messages.batchApproved', { count: successCount }))
      } else {
        message.warning(t('reviewUpdates.messages.batchDeclined', { count: successCount }))
      }
    } else if (pendingRequest.value) {
      // Single request action
      if (pendingAction.value === 'approve') {
        await approveChangeRequest(pendingRequest.value.id, reviewComment.value || undefined)
        message.success(t('reviewUpdates.messages.approved'))
      } else {
        await declineChangeRequest(pendingRequest.value.id, reviewComment.value || undefined)
        message.warning(t('reviewUpdates.messages.declined'))
      }
    }

    cancelReview()
    fetchChangeRequests()
  } catch (error) {
    console.error(`Error ${pendingAction.value}ing change request:`, error)
    message.error(t('reviewUpdates.messages.actionFailed', { action: pendingAction.value }))
  } finally {
    isProcessing.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchChangeRequests(), fetchUnits()])
})
</script>
