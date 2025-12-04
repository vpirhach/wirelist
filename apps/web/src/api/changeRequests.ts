import axiosInstance from './axiosInstance'
import type { AxiosResponse } from 'axios'
import type { DataItem } from './wireslist'

/**
 * Change Request API
 * Uses Node.js backend (v2)
 */

export type ChangeRequestType = 'CREATE' | 'UPDATE' | 'DELETE'
export type ChangeRequestStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'REJECTED'

/**
 * Represents a single field change with old and new values
 */
export interface FieldChange {
  oldValue: any
  newValue: any
}

export interface Author {
  id: string
  username: string
  fullName: string
}

export interface ChangeRequest {
  id: string
  wireId: string | null
  requestType: ChangeRequestType
  status: ChangeRequestStatus
  fromDestination: string | null
  toDestination: string | null
  wireCodeId: number | null
  colorId: number | null
  ioTypeId: string | null
  sub: number | null
  word: number | null
  bits: number | null
  power: string | null
  origin: string | null
  wireNumber: string | null
  hwModelsId: number | null
  remarks: string | null
  noteCode: string | null
  changeNumber: string | null
  changeDate: string | null
  hwAddress: string | null
  coord: string | null
  decommissioned: string | null
  ped: string | null
  network: string | null
  changes: Record<string, FieldChange> | null
  batchId: string | null // For grouping requests created in the same batch
  author: Author
  reviewComment: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthorGroupedChangeRequests {
  author: Author
  updatedDate: string
  requests: ChangeRequest[]
  count: number
}

export interface CreateChangeRequestDto {
  wireId?: number | string
  requestType: ChangeRequestType
  fromDestination?: string
  toDestination?: string
  wireCodeId?: number
  colorId?: number
  ioTypeId?: string
  sub?: number
  word?: number
  bits?: number
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
  changes?: Record<string, FieldChange>
}

export interface BatchCreateChangeRequestDto {
  requests: CreateChangeRequestDto[]
}

export interface ReviewDto {
  comment?: string
}

export interface PaginatedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
  numberOfElements: number
}

/**
 * Create a single change request
 */
export const createChangeRequest = (
  dto: CreateChangeRequestDto,
): Promise<AxiosResponse<ChangeRequest>> => {
  return axiosInstance.post<ChangeRequest>('/change-requests', dto)
}

/**
 * Create multiple change requests at once (batch)
 */
export const createBatchChangeRequests = (
  dto: BatchCreateChangeRequestDto,
): Promise<AxiosResponse<ChangeRequest[]>> => {
  return axiosInstance.post<ChangeRequest[]>('/change-requests/batch', dto)
}

/**
 * Get all pending change requests
 */
export const getPendingChangeRequests = (
  page: number = 0,
  size: number = 50,
): Promise<AxiosResponse<PaginatedResponse<ChangeRequest>>> => {
  return axiosInstance.get<PaginatedResponse<ChangeRequest>>('/change-requests', {
    params: { page, size },
  })
}

/**
 * Get pending change requests grouped by author
 */
export const getChangeRequestsGroupedByAuthor = (): Promise<
  AxiosResponse<AuthorGroupedChangeRequests[]>
> => {
  return axiosInstance.get<AuthorGroupedChangeRequests[]>('/change-requests/grouped-by-author')
}

/**
 * Get ALL change requests grouped by author (includes all statuses)
 */
export const getAllChangeRequestsGroupedByAuthor = (): Promise<
  AxiosResponse<AuthorGroupedChangeRequests[]>
> => {
  return axiosInstance.get<AuthorGroupedChangeRequests[]>(
    '/change-requests/all-grouped-by-author',
  )
}

/**
 * Get all change requests with pagination and filters
 */
export const getAllChangeRequests = (
  page: number = 0,
  size: number = 50,
  unit?: string,
  status?: ChangeRequestStatus,
): Promise<AxiosResponse<PaginatedResponse<ChangeRequest>>> => {
  return axiosInstance.get<PaginatedResponse<ChangeRequest>>('/change-requests/all', {
    params: {
      page,
      size,
      ...(unit && { unit }),
      ...(status && { status }),
    },
  })
}

/**
 * Get a single change request by ID
 */
export const getChangeRequest = (id: string): Promise<AxiosResponse<ChangeRequest>> => {
  return axiosInstance.get<ChangeRequest>(`/change-requests/${id}`)
}

/**
 * Approve a change request (Admin only)
 */
export const approveChangeRequest = (
  id: string,
  comment?: string,
): Promise<AxiosResponse<ChangeRequest>> => {
  return axiosInstance.post<ChangeRequest>(`/change-requests/${id}/approve`, { comment })
}

/**
 * Decline a change request (Admin only)
 */
export const declineChangeRequest = (
  id: string,
  comment?: string,
): Promise<AxiosResponse<ChangeRequest>> => {
  return axiosInstance.post<ChangeRequest>(`/change-requests/${id}/decline`, { comment })
}

/**
 * Reject/delete a change request (Admin only)
 */
export const rejectChangeRequest = (id: string): Promise<AxiosResponse<void>> => {
  return axiosInstance.delete<void>(`/change-requests/${id}`)
}

/**
 * Approve all pending requests from an author (Admin only)
 */
export const approveByAuthor = (
  authorId: string,
  comment?: string,
): Promise<AxiosResponse<{ approvedCount: number }>> => {
  return axiosInstance.post<{ approvedCount: number }>(
    `/change-requests/approve-by-author/${authorId}`,
    { comment },
  )
}

/**
 * Decline all pending requests from an author (Admin only)
 */
export const declineByAuthor = (
  authorId: string,
  comment?: string,
): Promise<AxiosResponse<{ declinedCount: number }>> => {
  return axiosInstance.post<{ declinedCount: number }>(
    `/change-requests/decline-by-author/${authorId}`,
    { comment },
  )
}

/**
 * Reject/delete all pending requests from an author (Admin only)
 */
export const rejectByAuthor = (
  authorId: string,
): Promise<AxiosResponse<{ rejectedCount: number }>> => {
  return axiosInstance.delete<{ rejectedCount: number }>(
    `/change-requests/reject-by-author/${authorId}`,
  )
}

/**
 * Helper: Convert a DataItem wire to a change request DTO for UPDATE
 * @param wire - The current (new) wire data
 * @param type - The type of change request (CREATE, UPDATE, DELETE)
 * @param changes - Optional changes object with old and new values
 */
export const wireToChangeRequest = (
  wire: DataItem,
  type: ChangeRequestType = 'UPDATE',
  changes?: Record<string, FieldChange>,
): CreateChangeRequestDto => {
  return {
    wireId: wire.id ?? undefined,
    requestType: type,
    fromDestination: wire.fromDestination,
    toDestination: wire.toDestination,
    wireCodeId: wire.wireCodeId,
    colorId: wire.colorId,
    ioTypeId: wire.ioTypeId,
    sub: wire.sub,
    word: wire.word,
    bits: wire.bits,
    power: wire.power,
    origin: wire.origin,
    wireNumber: wire.wireNumber,
    hwModelsId: wire.hwModelsId,
    remarks: wire.remarks,
    noteCode: wire.noteCode,
    changeNumber: wire.changeNumber,
    changeDate: wire.changeDate,
    hwAddress: wire.hwAddress,
    coord: wire.coord,
    decommissioned: wire.decommissioned,
    ped: wire.ped,
    network: wire.network,
    changes: changes,
  }
}
