<template>
  <ScrollableContainer :scroll-amount="300">
    <table class="w-full border-collapse bg-white text-sm whitespace-nowrap">
      <thead class="bg-gray-50 border-b-2 border-gray-200">
        <tr>
          <!-- Checkbox Column Header (only shown when not hiding actions) -->
          <th
            v-if="!hideActions"
            class="px-4 py-3 text-center font-semibold text-gray-700 border-b-2 border-gray-200 sticky top-0 bg-gray-50 z-10 w-12"
          >
            <NCheckbox
              :checked="isAllSelected"
              :indeterminate="isSomeSelected"
              @update:checked="toggleSelectAll"
            />
          </th>
          <!-- Actions Column Header (only shown when not hiding actions) -->
          <th
            v-if="!hideActions"
            class="px-4 py-3 text-center font-semibold text-gray-700 border-b-2 border-gray-200 sticky top-0 bg-gray-50 z-10 w-32"
          >
            Actions
          </th>
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
        <tr
          v-for="(row, rowIndex) in data"
          :key="row.id || rowIndex"
          :class="[
            'transition-colors duration-200 hover:bg-gray-100 even:bg-gray-50',
            { 'bg-blue-50': !hideActions && isRowSelected(row) },
          ]"
        >
          <!-- Checkbox Column Cell (only shown when not hiding actions) -->
          <td
            v-if="!hideActions"
            class="px-4 py-1 text-center border-b border-gray-100 cursor-pointer hover:bg-gray-200"
            @click="toggleRowSelection(row)"
          >
            <NCheckbox :checked="isRowSelected(row)" />
          </td>

          <!-- Actions Column Cell (only shown when not hiding actions) -->
          <td v-if="!hideActions" class="px-2 py-1 text-center border-b border-gray-100">
            <NSpace justify="center" :size="4">
              <NButton
                size="small"
                type="success"
                @click="approveRowUpdates(row)"
                :title="'Approve all updates'"
              >
                <template #icon>
                  <CheckIcon class="w-4 h-4" />
                </template>
              </NButton>
              <NButton
                size="small"
                type="error"
                @click="rejectRowUpdates(row)"
                :title="'Reject all updates'"
              >
                <template #icon>
                  <XMarkIcon class="w-4 h-4" />
                </template>
              </NButton>
            </NSpace>
          </td>

          <!-- Data columns -->
          <td
            v-for="(column, colIndex) in columns"
            :key="(column as any).key || colIndex"
            class="px-2 py-1 text-gray-800 border-b border-gray-100 relative whitespace-nowrap"
          >
            <component v-if="(column as any).render" :is="(column as any).render(row, rowIndex)" />
            <ReviewUpdateCell
              v-else
              :value="getCellValue(row, (column as any).key || '')"
              :has-update="hasUpdate(row, (column as any).key)"
              :update-info="getUpdateInfo(row, (column as any).key)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </ScrollableContainer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NCheckbox, NButton, NSpace } from 'naive-ui'
import { CheckIcon, XMarkIcon } from '@heroicons/vue/24/solid'
import type { DataTableColumns } from 'naive-ui'
import type { DataItem } from '@/api/wireslist'
import ScrollableContainer from './ScrollableContainer.vue'
import ReviewUpdateCell from './ReviewUpdateCell.vue'

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
}

interface Props {
  data: DataItem[]
  columns: DataTableColumns<DataItem>
  pendingUpdates: Record<string | number, UpdateInfo[]>
  hideActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hideActions: false,
})

const emit = defineEmits<{
  'update-selected': [updateIds: string[]]
  'approve-update': [wireId: string | number, updateIndex: number]
  'reject-update': [wireId: string | number, updateIndex: number]
}>()

// Selection state
const selectedRows = ref<Set<string | number>>(new Set())

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
  const selectedIds = Array.from(selectedRows.value).map(String)
  emit('update-selected', selectedIds)
}

const hasUpdate = (row: DataItem, key: string): boolean => {
  const rowId = getRowId(row)
  return !!props.pendingUpdates[rowId]?.some((update) => update.changes[key])
}

const getUpdateInfo = (row: DataItem, key: string) => {
  const rowId = getRowId(row)
  // Get the most recent update for this field
  const update = props.pendingUpdates[rowId]?.find((update) => update.changes[key])
  return update?.changes[key] || null
}

const approveRowUpdates = (row: DataItem) => {
  const rowId = getRowId(row)
  const updates = props.pendingUpdates[rowId]
  if (updates && updates.length > 0) {
    // Approve all updates for this row (starting from most recent)
    updates.forEach((_, index) => {
      emit('approve-update', rowId, index)
    })
  }
}

const rejectRowUpdates = (row: DataItem) => {
  const rowId = getRowId(row)
  const updates = props.pendingUpdates[rowId]
  if (updates && updates.length > 0) {
    // Reject all updates for this row
    updates.forEach((_, index) => {
      emit('reject-update', rowId, index)
    })
  }
}
</script>
