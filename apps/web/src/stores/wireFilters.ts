import { defineStore } from 'pinia'

export const useWireFiltersStore = defineStore('wireFilters', {
  state: () => ({
    filters: {} as Record<string, Record<string, string[]>>,
  }),
  actions: {
    setFilter(columnKey: string, filterKey: string, filterValues: string[]) {
      this.filters[columnKey] = {
        ...this.filters[columnKey],
        [filterKey]: filterValues,
      }
    },
    removeFilter(columnKey: string, filterKey: string, option: string) {
      this.filters[columnKey][filterKey] = this.filters[columnKey][filterKey].filter(
        (value) => value !== option,
      )
    },
    clearFilter(columnKey: string, filterKey: string) {
      this.filters[columnKey][filterKey] = []
    },
  },
})
