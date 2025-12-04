import { reactive, computed, type ComputedRef } from 'vue'

interface PaginationOptions {
  initialPage?: number
  initialPageSize?: number
  pageSizes?: number[]
  showSizePicker?: boolean
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
}

interface PaginationState {
  page: number
  pageSize: number
  pageCount: number
  showSizePicker: boolean
  pageSizes: number[]
}

export function usePagination(totalPages: ComputedRef<number>, options: PaginationOptions = {}) {
  const {
    initialPage = 1,
    initialPageSize = 30,
    pageSizes = [10, 30, 50, 100],
    showSizePicker = true,
    onPageChange,
    onPageSizeChange,
  } = options

  const state = reactive<PaginationState>({
    page: initialPage,
    pageSize: initialPageSize,
    pageCount: totalPages.value,
    showSizePicker,
    pageSizes,
  })

  const handlePageChange = (page: number) => {
    state.page = page
    onPageChange?.(page)
  }

  const handlePageSizeChange = (pageSize: number) => {
    state.pageSize = pageSize
    state.page = 1 // Reset to first page when page size changes
    onPageSizeChange?.(pageSize)
  }

  const pagination = computed(() => ({
    page: state.page,
    pageSize: state.pageSize,
    pageCount: state.pageCount,
    showSizePicker: state.showSizePicker,
    pageSizes: state.pageSizes,
    onChange: handlePageChange,
    onUpdatePageSize: handlePageSizeChange,
  }))

  return {
    pagination,
    state,
  }
}
