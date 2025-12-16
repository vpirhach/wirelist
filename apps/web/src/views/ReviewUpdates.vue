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

      <!-- Change Requests (each request contains multiple records) -->
      <div v-if="changeRequests.length > 0" class="space-y-4">
        <div
          v-for="request in changeRequests"
          :key="request.id"
          class="bg-white rounded-lg shadow overflow-hidden"
        >
          <!-- Request Header -->
          <div
            class="bg-gradient-to-r from-indigo-50 to-indigo-100 px-4 py-3 border-b flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <span
                class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold"
              >
                {{ request.recordCount }}
              </span>
              <span class="text-sm font-medium text-indigo-800">
                {{ t('reviewUpdates.changesBy', { count: request.recordCount }) }}
                {{ request.author.fullName }}
              </span>
              <span
                class="px-2 py-1 text-xs font-medium rounded-full"
                :class="getStatusClass(request.status)"
              >
                {{ t(`updates.status.${request.status.toLowerCase()}`) }}
              </span>
              <span class="text-xs text-indigo-600">
                {{ new Date(request.createdAt).toLocaleString() }}
              </span>
            </div>
            <NSpace v-if="request.status === 'PENDING'" size="small">
              <NButton size="tiny" type="success" @click="handleApprove(request)">
                {{ t('reviewUpdates.approve') }}
              </NButton>
              <NButton size="tiny" type="warning" @click="handleDecline(request)">
                {{ t('reviewUpdates.decline') }}
              </NButton>
              <NButton size="tiny" type="error" @click="handleReject(request)">
                {{ t('reviewUpdates.delete') }}
              </NButton>
            </NSpace>
          </div>

          <!-- Request Comment (if any) -->
          <div v-if="request.comment" class="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
            <span class="font-medium">{{ t('reviewUpdates.comment') }}:</span> {{ request.comment }}
          </div>

          <!-- Review Comment (if reviewed) -->
          <div
            v-if="request.reviewComment"
            class="px-4 py-2 bg-yellow-50 border-b text-sm text-gray-600"
          >
            <span class="font-medium">{{ t('reviewUpdates.reviewComment') }}:</span>
            {{ request.reviewComment }}
          </div>

          <!-- Records Table -->
          <table class="w-full">
            <thead class="bg-gray-50 border-b">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {{ t('reviewUpdates.table.type') }}
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
                  {{ t('reviewUpdates.table.changes') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="record in request.records" :key="record.id" class="hover:bg-gray-50">
                <td class="px-4 py-3">
                  <span
                    class="px-2 py-1 text-xs font-medium rounded"
                    :class="{
                      'bg-green-100 text-green-800': record.recordType === 'CREATE',
                      'bg-blue-100 text-blue-800': record.recordType === 'UPDATE',
                      'bg-red-100 text-red-800': record.recordType === 'DELETE',
                    }"
                  >
                    {{ t(`reviewUpdates.requestType.${record.recordType.toLowerCase()}`) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500">
                  {{ record.wireId || t('reviewUpdates.new') }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                  {{ record.fromDestination || '-' }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                  {{ record.toDestination || '-' }}
                </td>
                <td class="px-4 py-3 text-sm">
                  <div v-if="record.changes" class="max-w-xs">
                    <div v-for="(change, key) in record.changes" :key="key" class="text-xs">
                      <span class="font-medium">{{ key }}:</span>
                      <span class="text-red-500 line-through ml-1">{{ change.oldValue }}</span>
                      <span class="text-gray-400 mx-1">→</span>
                      <span class="text-green-600">{{ change.newValue }}</span>
                    </div>
                  </div>
                  <span v-else class="text-gray-400">-</span>
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
  useMessage,
} from 'naive-ui'
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
const isProcessing = ref(false)

// Options for select dropdowns
const unitOptions = computed(() => [...units.value.map((u) => ({ label: u, value: u }))])

const statusOptions = computed(() => [
  { label: t('updates.status.pending'), value: 'PENDING' },
  { label: t('updates.status.approved'), value: 'APPROVED' },
  { label: t('updates.status.declined'), value: 'DECLINED' },
])

const reviewModalTitle = computed(() => {
  if (!pendingAction.value || !pendingRequest.value) return ''

  return pendingAction.value === 'approve'
    ? t('reviewUpdates.modal.approveRequest')
    : t('reviewUpdates.modal.declineRequest')
})

const reviewModalDescription = computed(() => {
  if (!pendingAction.value || !pendingRequest.value) return ''

  const recordCount = pendingRequest.value.recordCount
  return pendingAction.value === 'approve'
    ? t('reviewUpdates.modal.approveDescription', { count: recordCount })
    : t('reviewUpdates.modal.declineDescription', { count: recordCount })
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

// Actions
const handleApprove = (request: ChangeRequest) => {
  pendingAction.value = 'approve'
  pendingRequest.value = request
  reviewComment.value = ''
  showReviewModal.value = true
}

const handleDecline = (request: ChangeRequest) => {
  pendingAction.value = 'decline'
  pendingRequest.value = request
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

const cancelReview = () => {
  showReviewModal.value = false
  pendingAction.value = null
  pendingRequest.value = null
  reviewComment.value = ''
}

const confirmReview = async () => {
  if (!pendingAction.value || !pendingRequest.value) return

  isProcessing.value = true

  try {
    if (pendingAction.value === 'approve') {
      await approveChangeRequest(pendingRequest.value.id, reviewComment.value || undefined)
      message.success(t('reviewUpdates.messages.approved'))
    } else {
      await declineChangeRequest(pendingRequest.value.id, reviewComment.value || undefined)
      message.warning(t('reviewUpdates.messages.declined'))
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
