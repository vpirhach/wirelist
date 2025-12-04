<template>
  <div class="grid grid-cols-12 gap-4 md:gap-6">
    <div class="col-span-12">
      <NDataTable
        :columns="columns"
        :data="data"
        :scroll-x="1800"
        :row-class-name="getRowClassName"
      />
      <NPagination
        class="mt-6 justify-end"
        v-model:page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-count="pagination.pageCount"
        :show-size-picker="pagination.showSizePicker"
        :page-sizes="pagination.pageSizes"
        @update:page="pagination.onChange"
        @update:page-size="pagination.onUpdatePageSize"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, h, watch } from 'vue'
import { NDataTable, NPagination, type DataTableColumns } from 'naive-ui'
import { type WireChange } from '@/api/wireChanges'
import { useWireChangesStore } from '@/stores/wireChanges'
import { useI18n } from 'vue-i18n'
import { formatDateTime } from '@/utils/date'
import { usePagination } from '@/composables/usePagination'

const { t } = useI18n()
const wireChangesStore = useWireChangesStore()

const columns = computed<DataTableColumns<WireChange>>(() => [
  {
    title: t('table.auditType'),
    key: 'auditType',
    fixed: 'left',
  },
  {
    title: t('table.auditDate'),
    key: 'auditDate',
    fixed: 'left',
    render(row) {
      return formatDateTime(row.auditDate)
    },
  },
  {
    title: t('table.author'),
    key: 'author.fullName',
    fixed: 'left',
  },
  {
    title: t('table.from'),
    key: 'fromDestination',
    fixed: 'left',
  },
  {
    title: t('table.to'),
    key: 'toDestination',
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
  },
  {
    title: t('table.word'),
    key: 'word',
  },
  {
    title: t('table.bit'),
    key: 'bits',
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
    key: 'noteCode',
  },
])

const { pagination } = usePagination(
  computed(() => wireChangesStore.pageData.totalPages),
  {
    initialPageSize: 30,
    onPageChange: async (page: number) => {
      wireChangesStore.updatePageNumber(page - 1)
      wireChangesStore.fetchWireChanges()
    },
    onPageSizeChange: (pageSize: number) => {
      wireChangesStore.updatePageSize(pageSize)
      wireChangesStore.updatePageNumber(0)
      wireChangesStore.fetchWireChanges()
    },
  },
)

onMounted(async () => {
  await wireChangesStore.fetchWireChanges()
})

const data = computed(() => wireChangesStore.wireChanges)

const getRowClassName = (row: WireChange) => {
  const auditTypeColorsMap = {
    DELETE: 'delete-highlight',
    CREATE: 'create-highlight',
    UPDATE: 'update-highlight',
  }

  return auditTypeColorsMap[row.auditType]
}
</script>

<style lang="css">
.n-data-table {
  --color-delete: #fee2e2;
  --color-create: #dcfce7;
  --color-update: #dbeafe;
}

.n-data-table .delete-highlight .n-data-table-td {
  background-color: var(--color-delete);
}

.n-data-table .create-highlight .n-data-table-td {
  background-color: var(--color-create);
}

.n-data-table .update-highlight .n-data-table-td {
  background-color: var(--color-update);
}
</style>
