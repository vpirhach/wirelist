<template>
  <div class="w-full h-full overflow-hidden rounded-lg shadow-sm relative flex flex-col">
    <!-- Horizontal scroll buttons -->
    <button
      v-if="showLeftButton"
      @click="scrollLeft"
      class="absolute left-2 top-0 z-30 bg-white shadow-lg rounded-full p-2 hover:bg-gray-100 transition-colors"
      aria-label="Scroll left"
    >
      <ChevronLeftIcon class="w-5 h-5 text-gray-700" />
    </button>
    <button
      v-if="showRightButton"
      @click="scrollRight"
      class="absolute right-2 top-0 z-30 bg-white shadow-lg rounded-full p-2 hover:bg-gray-100 transition-colors"
      aria-label="Scroll right"
    >
      <ChevronRightIcon class="w-5 h-5 text-gray-700" />
    </button>

    <!-- Scroll container -->
    <div
      ref="scrollContainerRef"
      class="w-full flex-1 overflow-x-auto overflow-y-auto"
      :style="containerHeight !== '100%' ? { maxHeight: containerHeight } : undefined"
      @scroll="handleScroll"
    >
      <table class="w-full border-collapse bg-white text-sm whitespace-nowrap">
        <!-- Sticky Header -->
        <thead class="bg-gray-50 border-b-2 border-gray-200 sticky top-0 z-20">
          <tr>
            <th
              class="px-4 py-3 text-center font-semibold text-gray-700 border-b-2 border-r border-gray-200 bg-gray-50 w-12"
            >
              <NCheckbox
                :checked="isAllSelected"
                :indeterminate="isSomeSelected"
                @update:checked="toggleSelectAll"
              />
            </th>
            <th
              class="px-2 py-3 text-center font-semibold text-gray-700 border-b-2 border-gray-200 bg-gray-50 w-8"
            ></th>
            <th
              v-for="(column, colIndex) in columns"
              :key="(column as any).key || colIndex"
              class="px-4 py-3 text-left font-semibold text-gray-700 border-b-2 border-r border-gray-200 bg-gray-50 whitespace-nowrap"
            >
              {{ (column as any).title }}
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- Virtual scroll spacer (top) -->
          <tr v-if="virtualScrollEnabled && offsetY > 0" aria-hidden="true">
            <td :colspan="columns.length + 2" :style="{ height: `${offsetY}px`, padding: 0 }"></td>
          </tr>

          <!-- Visible rows -->
          <template v-for="(row, idx) in visibleData" :key="row.id || getActualIndex(idx)">
            <!-- Page Divider -->
            <tr v-if="shouldShowPageDivider(getActualIndex(idx))" class="page-divider">
              <td
                :colspan="columns.length + 2"
                class="px-4 py-2 bg-linear-to-r from-indigo-100 via-indigo-50 to-indigo-100 border-y-2 border-indigo-200"
              >
                <div class="flex items-center justify-center gap-3">
                  <div class="h-px bg-indigo-300 flex-1"></div>
                  <span
                    class="text-sm font-semibold text-indigo-700 px-4 py-1 bg-white rounded-full shadow-sm border border-indigo-200"
                  >
                    {{ t('table.page') }} {{ getPageNumber(getActualIndex(idx)) }}
                  </span>
                  <div class="h-px bg-indigo-300 flex-1"></div>
                </div>
              </td>
            </tr>

            <!-- Main Row -->
            <tr
              class="transition-colors duration-200 hover:bg-gray-300"
              :style="{ height: `${rowHeight}px` }"
            >
              <td
                class="px-4 py-1 text-center border-b border-r border-gray-200 cursor-pointer hover:bg-gray-300"
                @click="toggleRowSelection(row)"
              >
                <NCheckbox :checked="isRowSelected(row)" />
              </td>
              <td class="px-2 py-1 text-center border-b border-gray-200">
                <ChevronDownIcon
                  v-if="hasRowUpdate(row)"
                  class="w-5 h-5 cursor-pointer transition-transform text-blue-500 hover:text-blue-700"
                  :class="{ 'rotate-180': isRowExpanded(row) }"
                  @click="toggleRowExpand(row)"
                />
              </td>
              <td
                v-for="(column, colIndex) in columns"
                :key="(column as any).key || colIndex"
                class="px-2 py-1 text-gray-800 border-b border-r border-gray-200 relative whitespace-nowrap group/cell"
              >
                <component
                  v-if="(column as any).render"
                  :is="(column as any).render(row, getActualIndex(idx))"
                />
                <!-- Searchable cell with search icon + editable -->
                <div v-else-if="(column as any).searchByClick" class="flex items-center gap-1">
                  <MagnifyingGlassIcon
                    class="w-4 h-4 text-gray-400 hover:text-indigo-600 cursor-pointer opacity-0 group-hover/cell:opacity-100 transition-opacity shrink-0"
                    :title="t('table.clickToSearch')"
                    @click.stop="handleSearchByClick(getCellValue(row, (column as any).key || ''))"
                  />
                  <WiresDataEditable
                    :value="getCellValue(row, (column as any).key || '')"
                    :has-update="hasLocalUpdate(row, (column as any).key)"
                    :update-info="getUpdateInfo(row, (column as any).key)"
                    @value-updated="
                      (newValue, oldValue) =>
                        handleCellUpdate(row, getActualIndex(idx), (column as any).key, newValue, oldValue)
                    "
                  />
                </div>
                <WiresDataEditable
                  v-else
                  :value="getCellValue(row, (column as any).key || '')"
                  :has-update="hasLocalUpdate(row, (column as any).key)"
                  :update-info="getUpdateInfo(row, (column as any).key)"
                  @value-updated="
                    (newValue, oldValue) =>
                      handleCellUpdate(row, getActualIndex(idx), (column as any).key, newValue, oldValue)
                  "
                />
              </td>
            </tr>

            <!-- Expanded Row - Show Updates -->
            <tr v-if="isRowExpanded(row)" class="bg-blue-50">
              <td colspan="2" class="border-b border-gray-200"></td>
              <td :colspan="columns.length" class="px-4 py-3 border-b border-gray-200">
                <div class="space-y-4">
                  <h4 class="font-semibold text-sm text-gray-700 mb-2">{{ t('updates.history') }}</h4>
                  <div
                    v-for="(update, updateIndex) in getAllRowUpdates(row)"
                    :key="updateIndex"
                    class="border-l-4 pl-4 py-2"
                    :class="update.status === 'APPROVED' ? 'border-green-400' : 'border-blue-400'"
                  >
                    <div class="flex items-center gap-3 text-xs text-gray-500 mb-2">
                      <span>{{ new Date(update.updatedDate).toLocaleString() }}</span>
                      <span v-if="update.authorName" class="font-medium text-gray-700">
                        {{ t('updates.by') }} {{ update.authorName }}
                      </span>
                      <span
                        v-if="update.status"
                        class="px-2 py-0.5 rounded-full text-xs font-medium"
                        :class="{
                          'bg-yellow-100 text-yellow-800': update.status === 'PENDING',
                          'bg-green-100 text-green-800': update.status === 'APPROVED',
                        }"
                      >
                        {{ t(`updates.status.${update.status.toLowerCase()}`) }}
                      </span>
                    </div>
                    <div class="space-y-1">
                      <div
                        v-for="(change, fieldKey) in update.changes"
                        :key="fieldKey"
                        class="flex items-center gap-4 text-sm"
                      >
                        <span class="font-medium text-gray-600 min-w-[120px]">{{ fieldKey }}:</span>
                        <span class="line-through text-red-500">{{ change.oldValue }}</span>
                        <span class="text-gray-400">→</span>
                        <span class="text-green-600 font-medium">{{ change.newValue }}</span>
                      </div>
                    </div>
                    <div
                      v-if="update.reviewComment"
                      class="mt-2 p-2 bg-gray-100 rounded text-sm text-gray-700 italic"
                    >
                      💬 "{{ update.reviewComment }}"
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>

          <!-- Virtual scroll spacer (bottom) -->
          <tr v-if="virtualScrollEnabled && bottomSpacerHeight > 0" aria-hidden="true">
            <td :colspan="columns.length + 2" :style="{ height: `${bottomSpacerHeight}px`, padding: 0 }"></td>
          </tr>

          <!-- Loading More Indicator -->
          <tr v-if="isLoadingMore">
            <td :colspan="columns.length + 2" class="py-8">
              <div class="flex items-center justify-center gap-3 text-gray-500">
                <NSpin size="small" />
                <span class="text-sm">{{ t('table.loadingMore') }}</span>
              </div>
            </td>
          </tr>

          <!-- End of Data Indicator -->
          <tr v-else-if="!hasMore && data.length > 0">
            <td :colspan="columns.length + 2" class="py-4">
              <div class="flex items-center justify-center gap-2 text-gray-400 text-sm">
                <span>{{ t('table.endOfList', { count: data.length }) }}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { NCheckbox, NSpin } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/solid'
import type { DataItem } from '@/api/wireslist'
import WiresDataEditable from './WiresDataEditable.vue'
import { useVirtualScroll } from '@/composables/useVirtualScroll'
import { RECORDS_PER_PAGE_DIVIDER } from '@/stores/wires'

const { t } = useI18n()

interface Props {
  data: DataItem[]
  columns: DataTableColumns<DataItem>
  scrollX?: number
  recordsPerPage?: number
  isLoadingMore?: boolean
  hasMore?: boolean
  /** Row height in pixels for virtual scroll calculation */
  rowHeight?: number
  /** Max visible rows to render (for virtual scroll) */
  maxVisibleRows?: number
  /** Container height CSS value */
  containerHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  scrollX: 1500,
  recordsPerPage: RECORDS_PER_PAGE_DIVIDER,
  isLoadingMore: false,
  hasMore: true,
  rowHeight: 36,
  maxVisibleRows: 50, // Configurable: max DOM elements for rows
  containerHeight: 'calc(100vh - 240px)',
})

const emit = defineEmits<{
  'update:data': [data: DataItem[]]
  'cell-updated': [
    rowIndex: number,
    key: string,
    newValue: any,
    oldValue: any,
    updatedDataItem: DataItem,
  ]
  'selection-changed': [selectedRows: DataItem[]]
  'updates-changed': [updates: Record<string | number, UpdateInfo[]>]
  'load-more': []
  'search-by-value': [value: string]
}>()

// Refs
const scrollContainerRef = ref<HTMLElement | null>(null)
const showLeftButton = ref(false)
const showRightButton = ref(false)

// Virtual scroll setup
const itemCount = computed(() => props.data.length)

const {
  visibleRange,
  totalHeight,
  offsetY,
  handleScroll: virtualHandleScroll,
  isNearBottom,
} = useVirtualScroll({
  itemCount,
  itemHeight: props.rowHeight,
  overscan: 10, // Render 10 extra rows above/below viewport
  containerRef: scrollContainerRef,
})

// Check if virtual scroll should be enabled
const virtualScrollEnabled = computed(() => props.data.length > props.maxVisibleRows)

// Get visible data slice
const visibleData = computed(() => {
  if (!virtualScrollEnabled.value) {
    return props.data
  }
  return props.data.slice(visibleRange.value.start, visibleRange.value.end)
})

// Calculate bottom spacer height
const bottomSpacerHeight = computed(() => {
  if (!virtualScrollEnabled.value) return 0
  const remainingItems = props.data.length - visibleRange.value.end
  return Math.max(0, remainingItems * props.rowHeight)
})

// Get actual index in full data array
const getActualIndex = (visibleIndex: number): number => {
  if (!virtualScrollEnabled.value) {
    return visibleIndex
  }
  return visibleRange.value.start + visibleIndex
}

// Selection state
const selectedRows = ref<Set<string | number>>(new Set())

// Updates tracking
interface UpdateInfo {
  rowIndex: number
  updatedDate: string
  changes: Record<
    string,
    {
      newValue: any
      oldValue: any
    }
  >
  authorName?: string
  status?: string
  reviewComment?: string
}

const updatedCells = ref<Record<string | number, UpdateInfo[]>>({})

// Expanded rows state
const expandedRows = ref<Set<string | number>>(new Set())

// Handle scroll with virtual scroll + horizontal scroll buttons + infinite load
const handleScroll = (event: Event) => {
  // Virtual scroll handling
  virtualHandleScroll(event)

  // Horizontal scroll buttons
  updateScrollButtons()

  // Infinite scroll - load more when near bottom
  if (isNearBottom.value && props.hasMore && !props.isLoadingMore) {
    emit('load-more')
  }
}

// Horizontal scroll buttons logic
const updateScrollButtons = () => {
  if (!scrollContainerRef.value) return

  const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.value
  showLeftButton.value = scrollLeft > 0
  showRightButton.value = scrollLeft + clientWidth < scrollWidth - 1
}

const scrollLeft = () => {
  if (!scrollContainerRef.value) return
  scrollContainerRef.value.scrollBy({ left: -300, behavior: 'smooth' })
}

const scrollRight = () => {
  if (!scrollContainerRef.value) return
  scrollContainerRef.value.scrollBy({ left: 300, behavior: 'smooth' })
}

// Page divider logic
const shouldShowPageDivider = (rowIndex: number): boolean => {
  return rowIndex > 0 && rowIndex % props.recordsPerPage === 0
}

const getPageNumber = (rowIndex: number): number => {
  return Math.floor(rowIndex / props.recordsPerPage) + 1
}

const getCellValue = (row: DataItem, key: string): any => {
  return row[key as keyof DataItem]
}

const handleSearchByClick = (value: any) => {
  if (value !== null && value !== undefined && value !== '') {
    emit('search-by-value', String(value))
  }
}

const getRowId = (row: DataItem): string | number => {
  return row.id ?? `${row.fromDestination}-${row.toDestination}-${row.wireNumber || ''}`
}

const isRowSelected = (row: DataItem): boolean => {
  return selectedRows.value.has(getRowId(row))
}

const isAllSelected = computed(() => {
  return props.data.length > 0 && selectedRows.value.size === props.data.length
})

const isSomeSelected = computed(() => {
  return selectedRows.value.size > 0 && selectedRows.value.size < props.data.length
})

const toggleRowSelection = (row: DataItem) => {
  const rowId = getRowId(row)
  if (selectedRows.value.has(rowId)) {
    selectedRows.value.delete(rowId)
  } else {
    selectedRows.value.add(rowId)
  }
  emitSelectionChanged()
}

const toggleSelectAll = (checked: boolean) => {
  if (checked) {
    props.data.forEach((row) => {
      selectedRows.value.add(getRowId(row))
    })
  } else {
    selectedRows.value.clear()
  }
  emitSelectionChanged()
}

const emitSelectionChanged = () => {
  const selected = props.data.filter((row) => isRowSelected(row))
  emit('selection-changed', selected)
}

const hasRowUpdate = (row: DataItem): boolean => {
  return !!(row.updates && row.updates.length > 0)
}

const getUpdateInfo = (row: DataItem, key: string) => {
  const rowId = getRowId(row)
  const localUpdate = updatedCells.value[rowId]?.find((update) => update.changes[key])
  return localUpdate?.changes[key] || null
}

const hasLocalUpdate = (row: DataItem, key: string): boolean => {
  const rowId = getRowId(row)
  return !!updatedCells.value[rowId]?.some((update) => update.changes[key])
}

const getAllRowUpdates = (row: DataItem): UpdateInfo[] => {
  const rowId = getRowId(row)
  const local = updatedCells.value[rowId] || []
  const server: UpdateInfo[] = (row.updates || []).map((update, index) => ({
    rowIndex: index,
    updatedDate: update.updatedDate,
    changes: update.changes,
    authorName: update.authorName,
    status: update.status,
    reviewComment: update.reviewComment,
  }))
  return [...local, ...server].sort(
    (a, b) => new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime(),
  )
}

const isRowExpanded = (row: DataItem): boolean => {
  return expandedRows.value.has(getRowId(row))
}

const toggleRowExpand = (row: DataItem) => {
  const rowId = getRowId(row)
  if (expandedRows.value.has(rowId)) {
    expandedRows.value.delete(rowId)
  } else {
    expandedRows.value.add(rowId)
  }
}

const handleCellUpdate = (
  row: DataItem,
  rowIndex: number,
  key: string,
  newValue: any,
  oldValue: any,
) => {
  const updatedData = [...props.data]
  const updatedRow = updatedData[rowIndex]
  ;(updatedRow as any)[key] = newValue

  const rowId = getRowId(row)
  const currentDate = new Date().toISOString()

  if (!updatedCells.value[rowId]) {
    updatedCells.value[rowId] = []
  }

  const mostRecentUpdate = updatedCells.value[rowId][0]
  const isRecentUpdate =
    mostRecentUpdate &&
    new Date().getTime() - new Date(mostRecentUpdate.updatedDate).getTime() < 60000

  if (isRecentUpdate) {
    mostRecentUpdate.changes[key] = { newValue, oldValue }
  } else {
    updatedCells.value[rowId].unshift({
      rowIndex,
      updatedDate: currentDate,
      changes: {
        [key]: { newValue, oldValue },
      },
    })
  }

  emit('update:data', updatedData)
  emit('cell-updated', rowIndex, key, newValue, oldValue, updatedData[rowIndex])
  emit('updates-changed', updatedCells.value)
}

// Clear selection when data changes significantly
watch(
  () => props.data.length,
  (newLength, oldLength) => {
    if (oldLength > 0 && newLength < oldLength / 2) {
      selectedRows.value.clear()
      emitSelectionChanged()
    }
  },
)

// Update scroll buttons on mount
watch(scrollContainerRef, () => {
  if (scrollContainerRef.value) {
    updateScrollButtons()
  }
})

// Expose methods for parent component
defineExpose({
  clearSelection: () => {
    selectedRows.value.clear()
    emitSelectionChanged()
  },
  getSelectedRows: () => props.data.filter((row) => isRowSelected(row)),
  getUpdatedCells: () => updatedCells.value,
  clearUpdates: () => {
    updatedCells.value = {}
    emit('updates-changed', updatedCells.value)
  },
  hasUpdates: () => Object.keys(updatedCells.value).length > 0,
  scrollToIndex: (index: number) => {
    if (scrollContainerRef.value) {
      scrollContainerRef.value.scrollTop = index * props.rowHeight
    }
  },
})
</script>

<style scoped>
.page-divider td {
  padding: 0;
}
</style>
