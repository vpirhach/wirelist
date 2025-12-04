import type { AxiosResponse } from 'axios'
import axiosInstance from './axiosInstance'

interface Pageable {
  offset: number
  pageNumber: number
  pageSize: number
}

interface WiresResponse {
  content: WireChange[]
  totalPages: number
  totalElements: number
  last: boolean
  size: number
  number: number
  sort: null
  first: boolean
  numberOfElements: number
  pageable: Pageable
}

export interface WireChange {
  id: number
  fromDestination: string
  toDestination: string
  wireCodeId: number
  colorId: number
  ioTypeId: string
  sub: number
  word: number
  bits: number
  power: string
  origin: string
  wireNumber: string
  hwModelsId: number
  remarks: string
  noteCode: string
  changeNumber: string
  changeDate: string
  hwAddress: string | null
  coord: string
  decommissioned: string
  createdAt: string
  ped: string | null
  wireId: number
  auditType: 'DELETE' | 'CREATE' | 'UPDATE'
  reason: string
  auditDate: string
  author: string
}

export interface GetWireChangesOptions {
  size?: number
  page?: number
}

export const getWireChanges = (
  options: GetWireChangesOptions = {},
): Promise<AxiosResponse<WiresResponse>> => {
  return axiosInstance.get<WiresResponse>('/api/wire-audits', {
    params: {
      size: options.size || 10,
      page: options.page || 0,
    },
  })
}
