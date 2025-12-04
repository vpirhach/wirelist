import axiosInstance from './axiosInstance'

export interface UploadResponse {
  processId: string
  message: string
}

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
