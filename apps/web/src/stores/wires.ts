import { defineStore } from 'pinia'
import { getWires, type DataItem, updateWire, deleteWire, createWire } from '@/api/wireslist'
import { getUnits, getPanels } from '@/api/unitsAndPanels'

export interface WiresState {
  isLoading: boolean
  results: DataItem[]
  searchQuery: string
  pageData: PageData
  selectedWire: DataItem | null
  isSaving: boolean
  units: string[]
  panels: string[]
  selectedUnits: string[]
  selectedPanels: string[]
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
    results: [],
    units: [],
    panels: [],
    selectedUnits: [],
    selectedPanels: [],
    searchQuery: '',
    pageData: {
      totalPages: 0,
      pageNumber: 0,
      pageSize: 0,
      offset: 0,
      totalElements: 0,
    },
    selectedWire: null,
    isSaving: false,
  }),
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
    async fetchWires(): Promise<void> {
      this.isLoading = true

      try {
        const results = await getWires({
          size: this.pageData.pageSize,
          page: this.pageData.pageNumber,
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
      } catch (error) {
        console.error('Error while fetching the wires', error)
      } finally {
        this.isLoading = false
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
  },
})
