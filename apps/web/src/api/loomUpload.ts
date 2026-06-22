import axiosInstance from './axiosInstance'
import type { CreateChangeRecordDto, FieldChange } from './changeRequests'

export type LoomPreviewAction = 'CREATE' | 'UPDATE' | 'DELETE'

export interface LoomPreviewItem {
  id: string
  action: LoomPreviewAction
  routeKey: string
  wireId?: string
  fromDestination: string
  toDestination: string
  record: CreateChangeRecordDto
  warnings: string[]
}

export interface LoomPreviewResponse {
  previewId: string
  loomSessionId: string
  summary: { added: number; edited: number; deleted: number }
  items: LoomPreviewItem[]
  collisionWarnings: string[]
}

export interface LoomSubmitResponse {
  changeRequestId: string
  recordCount: number
}

const longTimeout = 180000

/**
 * Upload one or more .doc/.docx files; API forwards to Loom and returns diff preview.
 */
export const previewLoomUpload = async (
  files: File[],
  options: { skipDeletes?: boolean; fullSyncDeletes?: boolean } = {},
): Promise<LoomPreviewResponse> => {
  const formData = new FormData()
  for (const f of files) {
    formData.append('files', f)
  }
  if (options.skipDeletes) {
    formData.append('skipDeletes', 'true')
  }
  if (options.fullSyncDeletes) {
    formData.append('fullSyncDeletes', 'true')
  }

  const response = await axiosInstance.post<LoomPreviewResponse>('/loom-upload/preview', formData, {
    timeout: longTimeout,
  })
  return response.data
}

export const submitLoomPreview = async (payload: {
  previewId: string
  selectedItemIds: string[]
  comment?: string
}): Promise<LoomSubmitResponse> => {
  const response = await axiosInstance.post<LoomSubmitResponse>('/loom-upload/submit', payload, {
    timeout: 60000,
  })
  return response.data
}

/** Format field changes for display */
export function formatFieldChanges(changes: Record<string, FieldChange> | undefined): string {
  if (!changes || Object.keys(changes).length === 0) return '—'
  return Object.entries(changes)
    .map(([k, v]) => `${k}: ${JSON.stringify(v.oldValue)} → ${JSON.stringify(v.newValue)}`)
    .join('; ')
}
