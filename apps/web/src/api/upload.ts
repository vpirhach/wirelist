/**
 * Legacy CSV upload helper (deprecated). Wire list imports use Loom via {@link previewLoomUpload}.
 */
import axiosInstance from './axiosInstance'

export interface UploadResponse {
  processId: string
  message: string
}

/** @deprecated Use `previewLoomUpload` from `@/api/loomUpload` */
export const uploadFile = async (
  file: File,
  options: { isDeleteAllInList: boolean },
): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('isDeleteAllInList', options.isDeleteAllInList.toString())

  const response = await axiosInstance.post('/wires/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}
