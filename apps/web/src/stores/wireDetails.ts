import { defineStore } from 'pinia'
import { type DataItem } from '@/api/wireslist'

interface WireDetailsState {
  wireDetails: DataItem
  isOpen: boolean
}

const defaultWireDetails: Readonly<DataItem> = {
  id: null,
  fromDestination: '',
  toDestination: '',
  wireCodeId: 0,
  colorId: 0,
  ioTypeId: 0,
  sub: 0,
  word: 0,
  bits: 0,
  powerId: 0,
  power: '',
  origin: '',
  wireNumber: '',
  hwModelsId: 0,
  remarks: '',
  noteCode: '',
  changeNumber: '',
  changeDate: '',
  hwAddress: '',
  coord: '',
  decommissioned: '',
  createdAt: '',
} as const

export const useWireDetailsStore = defineStore('wireDetails', {
  state: (): WireDetailsState => ({
    wireDetails: { ...defaultWireDetails },
    isOpen: false,
  }),
  actions: {
    setWireDetails(wireDetails: DataItem) {
      this.wireDetails = wireDetails
    },
    resetWireDetails() {
      this.wireDetails = { ...defaultWireDetails }
    },
    openDetails(wireDetails?: DataItem) {
      this.setWireDetails(wireDetails || { ...defaultWireDetails })
      this.isOpen = true
    },
    closeDetails() {
      this.isOpen = false
      this.resetWireDetails()
    },
  },
})
