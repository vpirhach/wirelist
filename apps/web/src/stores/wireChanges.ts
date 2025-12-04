import { getWireChanges, type WireChange } from '@/api/wireChanges'
import { defineStore } from 'pinia'

export interface PageData {
  totalPages: number
  pageNumber: number
  pageSize: number
  offset: number
  totalElements: number
}

export const useWireChangesStore = defineStore('wireChanges', {
  state: () => ({
    wireChanges: [] as WireChange[],
    isLoading: false,
    pageData: {
      totalPages: 0,
      pageNumber: 0,
      pageSize: 10,
    },
  }),
  actions: {
    setPageData(pageData: PageData) {
      this.pageData = pageData
    },

    updatePageNumber(pageNumber: number) {
      this.pageData.pageNumber = pageNumber
    },

    updatePageSize(pageSize: number) {
      this.pageData.pageSize = pageSize
    },

    async fetchWireChanges(): Promise<void> {
      this.isLoading = true

      try {
        const results = await getWireChanges({
          size: this.pageData.pageSize,
          page: this.pageData.pageNumber,
        })

        this.wireChanges = results.data.content

        this.setPageData({
          totalPages: results.data.totalPages,
          totalElements: results.data.totalElements,
          ...results.data.pageable,
        })
      } catch (error) {
        console.error('Error while fetching the wires', error)
      } finally {
        this.isLoading = false
      }
    },
  },
})
