import { defineStore } from 'pinia'
import { getWires, type DataItem, updateWire, deleteWire, createWire } from '@/api/wireslist'
import { getUnits, getPanels } from '@/api/unitsAndPanels'

// Configurable: Number of records per visual page divider
export const RECORDS_PER_PAGE_DIVIDER = 100

export interface WiresState {
  isLoading: boolean
  isLoadingMore: boolean
  results: DataItem[]
  searchQuery: string
  pageData: PageData
  selectedWire: DataItem | null
  isSaving: boolean
  units: string[]
  panels: string[]
  selectedUnits: string[]
  selectedPanels: string[]
  hasMoreData: boolean
}

export interface PageData {
  totalPages: number
  pageNumber: number
  pageSize: number
  offset: number
  totalElements: number
}

export const useWiresStore = defineStore('wires', {
  state: (): WiresState => ({
    isLoading: false,
    isLoadingMore: false,
    results: [],
    units: [],
    panels: [],
    selectedUnits: [],
    selectedPanels: [],
    searchQuery: '',
    pageData: {
      totalPages: 0,
      pageNumber: 0,
      pageSize: 100, // Default page size for API calls
      offset: 0,
      totalElements: 0,
    },
    selectedWire: null,
    isSaving: false,
    hasMoreData: true,
  }),
  getters: {
    // Get current loaded count
    loadedCount: (state) => state.results.length,
    // Check if we can load more
    canLoadMore: (state) => state.hasMoreData && !state.isLoading && !state.isLoadingMore,
  },
  actions: {
    setPageData(pageData: PageData) {
      this.pageData = pageData
    },
    updateSearchQuery(query: string) {
      this.searchQuery = query
    },
    updatePageNumber(pageNumber: number) {
      this.pageData.pageNumber = pageNumber
    },
    updatePageSize(pageSize: number) {
      this.pageData.pageSize = pageSize
    },
    updateSelectedUnits(units: string[]) {
      this.selectedUnits = units
    },
    updateSelectedPanels(panels: string[]) {
      this.selectedPanels = panels
    },
    async fetchUnitsAndPanels(): Promise<void> {
      const [units, panels] = await Promise.all([getUnits(), getPanels()])
      this.units = units
      this.panels = panels
    },
    /**
     * Fetch wires - replaces current results (used for initial load and filter changes)
     */
    async fetchWires(): Promise<void> {
      this.isLoading = true
      this.pageData.pageNumber = 0 // Reset to first page

      try {
        const results = await getWires({
          size: this.pageData.pageSize,
          page: 0,
          keyword: this.searchQuery,
          unit: this.selectedUnits.join(','),
        })

        this.results = results.data.content

        this.setPageData({
          totalPages: results.data.totalPages,
          totalElements: results.data.totalElements,
          pageNumber: results.data.number,
          pageSize: results.data.size,
          offset: results.data.number * results.data.size,
        })

        // Check if there's more data to load
        this.hasMoreData = this.results.length < results.data.totalElements
      } catch (error) {
        console.error('Error while fetching the wires', error)
      } finally {
        this.isLoading = false
      }
    },
    /**
     * Load more wires - appends to current results (used for infinite scroll)
     */
    async loadMoreWires(): Promise<void> {
      if (!this.canLoadMore) return

      this.isLoadingMore = true
      const nextPage = this.pageData.pageNumber + 1

      try {
        const results = await getWires({
          size: this.pageData.pageSize,
          page: nextPage,
          keyword: this.searchQuery,
          unit: this.selectedUnits.join(','),
        })

        // Append new results to existing
        this.results = [...this.results, ...results.data.content]

        this.setPageData({
          totalPages: results.data.totalPages,
          totalElements: results.data.totalElements,
          pageNumber: results.data.number,
          pageSize: results.data.size,
          offset: results.data.number * results.data.size,
        })

        // Check if there's more data to load
        this.hasMoreData = this.results.length < results.data.totalElements
      } catch (error) {
        console.error('Error while loading more wires', error)
      } finally {
        this.isLoadingMore = false
      }
    },
    async updateWire(wire: DataItem): Promise<void> {
      try {
        this.isSaving = true
        const updatedWire = await updateWire(wire)
        this.results = this.results.map((w) => (w.id === wire.id ? updatedWire.data : w))
      } catch (error) {
        console.error('Error while updating the wire', error)
      } finally {
        this.isSaving = false
      }
    },

    async deleteWire(wire: DataItem): Promise<void> {
      try {
        await deleteWire(wire.id as number)
        this.results = this.results.filter((w) => w.id !== wire.id)

        console.log('Wire deleted', wire.id)
      } catch (error) {
        console.error('Error while deleting the wire', error)
      }
    },

    async createWire(wire: DataItem): Promise<void> {
      try {
        this.isSaving = true
        await createWire(wire)
        await this.refetch()
      } catch (error) {
        console.error('Error while creating the wire', error)
      } finally {
        this.isSaving = false
      }
    },

    async refetch(): Promise<void> {
      await this.fetchWires()
    },

    /**
     * Reset and refetch (used when filters change)
     */
    async resetAndFetch(): Promise<void> {
      this.results = []
      this.hasMoreData = true
      this.pageData.pageNumber = 0
      await this.fetchWires()
    },
  },
})
