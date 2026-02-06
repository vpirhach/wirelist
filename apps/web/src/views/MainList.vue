<template>
  <div class="h-full flex flex-col">
    <div class="shrink-0">
      <FilterTags />

      <NSpace justify="space-between" class="mb-4">
        <NSpace>
          <NButton
            v-if="Object.keys(updatedCells).length > 0"
            type="primary"
            @click="handleSaveChanges"
          >
            {{ t('mainList.saveUpdated', Object.keys(updatedCells).length) }}
          </NButton>
          <NButton v-if="selectedRows.length > 0" type="error" @click="handleDeleteSelected">
            {{ t('mainList.deleteSelected', selectedRows.length) }}
          </NButton>
        </NSpace>
        <NSpace align="center">
          <!-- Records count badge -->
          <span class="text-sm text-gray-500">
            {{ t('table.recordsLoaded', { loaded: data.length, total: wiresStore.pageData.totalElements }) }}
          </span>
          <NSwitch
            v-model:value="isExtendedTable"
            @update:value="onExtendedTableChanged"
            size="small"
          />
        {{ t('table.extended') }}
      </NSpace>
      </NSpace>
    </div>

    <!-- Table container - fills remaining space -->
    <div class="flex-1 min-h-0">
      <WiresDataTable
        ref="tableRef"
        :data="data"
        :columns="columns"
        :records-per-page="recordsPerPageDivider"
        :is-loading-more="wiresStore.isLoadingMore"
        :has-more="wiresStore.hasMoreData"
        :row-height="36"
        :max-visible-rows="maxVisibleRows"
        container-height="100%"
        @cell-updated="onCellUpdated"
        @selection-changed="onSelectionChanged"
        @updates-changed="onUpdatesChanged"
        @load-more="onLoadMore"
        @search-by-value="onSearchByValue"
        :scroll-x="1000"
      />

      <!-- Initial Loading State -->
      <div v-if="wiresStore.isLoading && data.length === 0" class="flex justify-center py-12">
        <NSpin size="large" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NSpace, NSwitch, NButton, NSpin, type DataTableColumns, useMessage } from 'naive-ui'
import { type DataItem } from '@/api/wireslist'
import { useWiresStore, RECORDS_PER_PAGE_DIVIDER } from '@/stores/wires'
import { useI18n } from 'vue-i18n'
import FilterTags from '@/components/FilterTags.vue'
import WiresDataTable from '@/components/WiresDataTable.vue'
import {
  createChangeRequest,
  wireToChangeRecord,
  type CreateChangeRecordDto,
  type FieldChange,
} from '@/api/changeRequests'

const { t } = useI18n()
const wiresStore = useWiresStore()
const message = useMessage()
const tableRef = ref<InstanceType<typeof WiresDataTable> | null>(null)
const selectedRows = ref<DataItem[]>([])

// Configurable: Number of records per visual page divider
// This can be changed here or imported from store
const recordsPerPageDivider = ref(RECORDS_PER_PAGE_DIVIDER)

// Configurable: Maximum number of DOM elements to render for virtual scroll
// Lower values = better performance, but faster scrolling may show blank areas
const maxVisibleRows = ref(50)

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

const updatedCells = ref<Record<string | number, UpdateInfo[]>>({})

const isExtendedTable = ref(localStorage.getItem('isExtendedTable') === 'true')

const baseColumnNames = [
  'fromDestination',
  'toDestination',
  'sub',
  'word',
  'bits',
  'remarks',
  'power',
]

const columns = computed<DataTableColumns<DataItem>>(() =>
  [
    {
      title: t('table.from'),
      key: 'fromDestination',
      fixed: 'left' as const,
      minWidth: 150,
      searchByClick: true,
    },
    {
      title: t('table.to'),
      key: 'toDestination',
      fixed: 'left' as const,
      minWidth: 150,
      searchByClick: true,
    },
    {
      title: t('table.wireCode'),
      key: 'wireCodeId',
    },
    {
      title: t('table.colorCode'),
      key: 'colorId',
    },
    {
      title: t('table.noteCode'),
      key: 'noteCode',
    },
    {
      title: t('table.ioType'),
      key: 'ioTypeId',
    },
    {
      title: t('table.subcontroller'),
      key: 'sub',
      width: isExtendedTable.value ? 50 : undefined,
      className: 'text-center',
    },
    {
      title: t('table.word'),
      key: 'word',
      width: isExtendedTable.value ? 50 : undefined,
      className: 'text-center',
    },
    {
      title: t('table.bit'),
      key: 'bits',
      width: isExtendedTable.value ? 50 : undefined,
      className: 'text-center',
    },
    {
      title: t('table.remarks'),
      key: 'remarks',
    },
    {
      title: t('table.power'),
      key: 'power',
    },
    {
      title: t('table.origin'),
      key: 'origin',
    },
    {
      title: t('table.ped'),
      key: 'ped',
    },
    {
      title: t('table.network'),
      key: 'network',
    },
    // if isExtendedTable is true, show all columns, otherwise show only the base columns
  ].filter((column) => isExtendedTable.value || baseColumnNames.includes(column.key)),
)

onMounted(async () => {
  await wiresStore.fetchWires()
  await wiresStore.fetchUnitsAndPanels()
})

const onLoadMore = async () => {
  await wiresStore.loadMoreWires()
}

const onSearchByValue = async (value: string) => {
  wiresStore.updateSearchQuery(value)
  await wiresStore.resetAndFetch()
}

const onExtendedTableChanged = (value: boolean) => {
  localStorage.setItem('isExtendedTable', value.toString())
}

const onCellUpdated = (
  rowIndex: number,
  key: string,
  newValue: any,
  oldValue: any,
  updatedDataItem: DataItem,
) => {
  console.log('Cell updated:', { rowIndex, key, newValue, oldValue, updatedDataItem })
}

const onSelectionChanged = (rows: DataItem[]) => {
  selectedRows.value = rows
}

const onUpdatesChanged = (updates: Record<string | number, UpdateInfo[]>) => {
  updatedCells.value = updates
}

const handleSaveChanges = async () => {
  if (Object.keys(updatedCells.value).length === 0) return

  try {
    // Build change records from updated cells
    const changeRecords: CreateChangeRecordDto[] = []

    for (const [wireId, updates] of Object.entries(updatedCells.value)) {
      // Get the latest update for this wire
      const latestUpdate = updates[updates.length - 1]
      const rowIndex = latestUpdate.rowIndex
      const wire = data.value[rowIndex]

      if (wire) {
        // Build the changes object from the tracked updates
        const changes: Record<string, FieldChange> = {}
        for (const [field, change] of Object.entries(latestUpdate.changes)) {
          changes[field] = {
            oldValue: change.oldValue,
            newValue: change.newValue,
          }
        }

        // Create an UPDATE change record with the current wire data and changes
        changeRecords.push(wireToChangeRecord(wire, 'UPDATE', changes))
      }
    }

    if (changeRecords.length > 0) {
      // Submit all change records as a single change request
      await createChangeRequest({ records: changeRecords })

      message.success(t('mainList.changeRecordsSubmitted', changeRecords.length))

      // Clear updates after successful submission
      tableRef.value?.clearUpdates()
    }
  } catch (error) {
    console.error('Error submitting change request:', error)
    message.error(t('mainList.submitFailed'))
  }
}

const handleDeleteSelected = async () => {
  if (selectedRows.value.length === 0) return

  try {
    // Build DELETE change records for selected rows
    const changeRecords: CreateChangeRecordDto[] = selectedRows.value.map((wire) =>
      wireToChangeRecord(wire, 'DELETE'),
    )

    if (changeRecords.length > 0) {
      // Submit all DELETE change records as a single change request
      await createChangeRequest({ records: changeRecords })

      message.success(t('mainList.deleteRecordsSubmitted', changeRecords.length))

      // Clear selection after successful submission
      tableRef.value?.clearSelection()
    }
  } catch (error) {
    console.error('Error submitting delete request:', error)
    message.error(t('mainList.deleteFailed'))
  }
}

const data = computed(() => wiresStore.results)
</script>
