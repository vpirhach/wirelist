import axiosInstance from './axiosInstance'
import type { AxiosResponse } from 'axios'

interface WiresResponse {
  content: DataItem[]
  totalPages: number
  totalElements: number
  last: boolean
  size: number
  number: number
  sort?: null
  first: boolean
  numberOfElements: number
  pageable?: Pageable
}

interface Pageable {
  offset: number
  pageNumber: number
  pageSize: number
}

/**
 * Represents a change request update for a wire (pending or approved)
 */
export interface WireUpdate {
  id: string
  updatedDate: string
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'REJECTED'
  changes: Record<string, { oldValue: any; newValue: any }>
  authorId?: string
  authorName?: string
  reviewComment?: string
}

export interface DataItem {
  id: number | string | null
  fromDestination: string
  toDestination: string
  wireCodeId?: number
  colorId?: number
  ioTypeId?: string
  sub?: number
  word?: number
  bits?: number
  powerId?: number
  power?: string
  origin?: string
  wireNumber?: string
  hwModelsId?: number
  remarks?: string
  noteCode?: string
  changeNumber?: string
  changeDate?: string
  hwAddress?: string
  coord?: string
  decommissioned?: string
  ped?: string
  network?: string
  createdAt?: string
  updatedAt?: string
  /** Change requests for this wire (pending or approved) */
  updates?: WireUpdate[]
}

export interface UnitSummary {
  unit: string
  count: number
  panels: string[]
}

export interface GetWiresOptions {
  size?: number
  page?: number
  keyword?: string
  unit?: string
  panel?: string
}

export interface SearchWiresOptions extends GetWiresOptions {
  keyword: string
}

/**
 * Get wires with optional search and filters
 * Uses Node.js backend (v2)
 */
export const getWires = (options: GetWiresOptions = {}): Promise<AxiosResponse<WiresResponse>> => {
  // Use search endpoint if keyword is provided, otherwise use main endpoint
  const path = options.keyword ? '/wires/search' : '/wires'

  return axiosInstance.get<WiresResponse>(path, {
    params: {
      size: options.size || 50,
      page: options.page || 0,
      ...(options.keyword && { keyword: options.keyword }),
      ...(options.unit && { unit: options.unit }),
      ...(options.panel && { panel: options.panel }),
    },
  })
}

/**
 * Get wire by ID
 * Uses Node.js backend (v2)
 */
export const getWireById = (id: number | string): Promise<AxiosResponse<DataItem>> => {
  return axiosInstance.get<DataItem>(`/wires/${id}`)
}

/**
 * Update an existing wire
 * Uses Node.js backend (v2)
 */
export const updateWire = (wire: DataItem): Promise<AxiosResponse<DataItem>> => {
  return axiosInstance.put<DataItem>(`/wires/${wire.id}`, wire)
}

/**
 * Create a new wire
 * Uses Node.js backend (v2)
 */
export const createWire = (wire: Omit<DataItem, 'id'>): Promise<AxiosResponse<DataItem>> => {
  return axiosInstance.post<DataItem>('/wires', wire)
}

/**
 * Delete a wire by ID
 * Uses Node.js backend (v2)
 */
export const deleteWire = (id: number | string): Promise<AxiosResponse<void>> => {
  return axiosInstance.delete<void>(`/wires/${id}`)
}

/**
 * Get unit summary with counts and panels
 * Uses Node.js backend (v2)
 */
export const getUnitSummary = (): Promise<AxiosResponse<UnitSummary[]>> => {
  return axiosInstance.get<UnitSummary[]>('/wires/unitSummary')
}

/**
 * Search wires by keyword
 * Uses Node.js backend (v2)
 */
export const searchWires = (options: SearchWiresOptions): Promise<AxiosResponse<WiresResponse>> => {
  return axiosInstance.get<WiresResponse>('/wires/search', {
    params: {
      keyword: options.keyword,
      size: options.size || 50,
      page: options.page || 0,
      ...(options.unit && { unit: options.unit }),
    },
  })
}

/**
 * Get wires by unit
 * Uses Node.js backend (v2)
 */
export const getWiresByUnit = (
  unit: string,
  page: number = 0,
  size: number = 30,
): Promise<AxiosResponse<WiresResponse>> => {
  return axiosInstance.get<WiresResponse>('/wires/byUnit', {
    params: { unit, page, size },
  })
}

/**
 * Get wires by panel
 * Uses Node.js backend (v2)
 */
export const getWiresByPanel = (
  panel: string,
  page: number = 0,
  size: number = 30,
): Promise<AxiosResponse<WiresResponse>> => {
  return axiosInstance.get<WiresResponse>('/wires/byPanel', {
    params: { panel, page, size },
  })
}

/**
 * Get basic summary statistics
 * Uses Node.js backend (v2)
 */
export const getSummary = (): Promise<
  AxiosResponse<{ total: number; byUnit: Record<string, number> }>
> => {
  return axiosInstance.get('/wires/summary')
}
