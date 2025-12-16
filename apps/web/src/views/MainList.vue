<template>
  <div class="grid grid-cols-12 gap-4 md:gap-6">
    <div class="col-span-12">
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
        <NSpace>
          <NSwitch
            v-model:value="isExtendedTable"
            @update:value="onExtendedTableChanged"
            size="small"
          />
          {{ t('table.extended') }}
        </NSpace>
      </NSpace>

      <WiresDataTable
        ref="tableRef"
        :data="data"
        :columns="columns"
        @cell-updated="onCellUpdated"
        @selection-changed="onSelectionChanged"
        @updates-changed="onUpdatesChanged"
        :scroll-x="1000"
      />
      <NPagination
        class="mt-6 justify-end"
        v-model:page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-count="pagination.pageCount"
        :show-size-picker="pagination.showSizePicker"
        :page-sizes="pagination.pageSizes"
        @update:page="onPageChanged"
        @update:page-size="onUpdatePageSize"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { NSpace, NPagination, NSwitch, NButton, type DataTableColumns, useMessage } from 'naive-ui'
import { type DataItem } from '@/api/wireslist'
import { useWiresStore } from '@/stores/wires'
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
      minWidth: 200,
    },
    {
      title: t('table.to'),
      key: 'toDestination',
      fixed: 'left' as const,
      minWidth: 200,
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

const pagination = reactive({
  page: 1,
  pageSize: 1000,
  pageCount: computed(() => wiresStore.pageData.totalPages),
  showSizePicker: true,
  pageSizes: [10, 30, 50, 100],
  onChange: (page: number) => {
    onPageChanged(page)
  },
  onUpdatePageSize: (pageSize: number) => {
    onUpdatePageSize(pageSize)
  },
})

onMounted(async () => {
  await wiresStore.fetchWires()
  await wiresStore.fetchUnitsAndPanels()
})

const onPageChanged = async (page: number) => {
  wiresStore.updatePageNumber(page - 1)
  wiresStore.fetchWires()
}

const onUpdatePageSize = (pageSize: number) => {
  wiresStore.updatePageSize(pageSize)
  wiresStore.updatePageNumber(0)
  wiresStore.fetchWires()
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
  // TODO: Implement backend update logic here
  // Example: wiresStore.updateWire(data.value[rowIndex])
}

const onSelectionChanged = (rows: DataItem[]) => {
  selectedRows.value = rows
}

const onUpdatesChanged = (updates: Record<string | number, UpdateInfo[]>) => {
  updatedCells.value = updates
  console.log('Updated cells:', updates)
}

const handleSaveChanges = async () => {
  if (Object.keys(updatedCells.value).length === 0) return

  console.log('Saving changes:', updatedCells.value)

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

const loadServerUpdates = async () => {
  // TODO: This will be replaced with actual API call
  // Example: const serverUpdates = await wiresStore.fetchPendingUpdates()

  // For now, the stub data is already in the table component
  // In production, you would call:
  // tableRef.value?.setServerUpdates(serverUpdates)

  console.log('Server updates loaded (using stub data in component)')
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
