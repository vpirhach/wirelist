<template>
  <ScrollableContainer :scroll-amount="300">
    <table class="w-full border-collapse bg-white text-sm whitespace-nowrap">
      <thead class="bg-gray-50 border-b-2 border-gray-200">
        <tr>
          <!-- Checkbox Column Header -->
          <th
            class="px-4 py-3 text-center font-semibold text-gray-700 border-b-2 border-gray-200 sticky top-0 bg-gray-50 z-10 w-12"
          >
            <NCheckbox
              :checked="isAllSelected"
              :indeterminate="isSomeSelected"
              @update:checked="toggleSelectAll"
            />
          </th>
          <!-- Expand Arrow Column Header -->
          <th
            class="px-2 py-3 text-center font-semibold text-gray-700 border-b-2 border-gray-200 sticky top-0 bg-gray-50 z-10 w-8"
          ></th>
          <th
            v-for="(column, colIndex) in columns"
            :key="(column as any).key || colIndex"
            class="px-4 py-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200 sticky top-0 bg-gray-50 z-10 whitespace-nowrap"
          >
            {{ (column as any).title }}
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(row, rowIndex) in data" :key="row.id || rowIndex">
          <!-- Main Row -->
          <tr class="transition-colors duration-200 hover:bg-gray-200 even:bg-gray-100">
            <!-- Checkbox Column Cell -->
            <td
              class="px-4 py-1 text-center border-b border-gray-100 cursor-pointer hover:bg-gray-300"
              @click="toggleRowSelection(row)"
            >
              <NCheckbox :checked="isRowSelected(row)" />
            </td>
            <!-- Expand Arrow Column Cell -->
            <td class="px-2 py-1 text-center border-b border-gray-100">
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
              class="px-2 py-1 text-gray-800 border-b border-gray-100 relative whitespace-nowrap"
            >
              <component
                v-if="(column as any).render"
                :is="(column as any).render(row, rowIndex)"
              />
              <WiresDataEditable
                v-else
                :value="getCellValue(row, (column as any).key || '')"
                :has-update="hasLocalUpdate(row, (column as any).key)"
                :update-info="getUpdateInfo(row, (column as any).key)"
                @value-updated="
                  (newValue, oldValue) =>
                    handleCellUpdate(row, rowIndex, (column as any).key, newValue, oldValue)
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
                  <!-- Review Comment -->
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
      </tbody>
    </table>
  </ScrollableContainer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NCheckbox } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { ChevronDownIcon } from '@heroicons/vue/24/solid'
import type { DataItem } from '@/api/wireslist'
import ScrollableContainer from './ScrollableContainer.vue'
import WiresDataEditable from './WiresDataEditable.vue'

const { t } = useI18n()

interface Props {
  data: DataItem[]
  columns: DataTableColumns<DataItem>
  scrollX?: number
}

const props = withDefaults(defineProps<Props>(), {
  scrollX: 1500,
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
}>()

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

const getCellValue = (row: DataItem, key: string): any => {
  return row[key as keyof DataItem]
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
  // Only return local updates for inline display
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
  // Get server updates directly from the wire's updates field
  const server: UpdateInfo[] = (row.updates || []).map((update, index) => ({
    rowIndex: index,
    updatedDate: update.updatedDate,
    changes: update.changes,
    authorName: update.authorName,
    status: update.status,
    reviewComment: update.reviewComment,
  }))
  // Combine and sort by date (most recent first)
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
  // Update the data
  const updatedData = [...props.data]
  const updatedRow = updatedData[rowIndex]
  ;(updatedRow as any)[key] = newValue

  // Track the update
  const rowId = getRowId(row)
  const currentDate = new Date().toISOString()

  if (!updatedCells.value[rowId]) {
    updatedCells.value[rowId] = []
  }

  // Check if there's already an update for this field in the most recent update
  const mostRecentUpdate = updatedCells.value[rowId][0]
  const isRecentUpdate =
    mostRecentUpdate &&
    new Date().getTime() - new Date(mostRecentUpdate.updatedDate).getTime() < 60000 // Within 1 minute

  if (isRecentUpdate) {
    // Add to existing recent update
    mostRecentUpdate.changes[key] = { newValue, oldValue }
  } else {
    // Create new update entry
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
})
</script>
