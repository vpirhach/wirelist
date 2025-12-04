import { ref } from 'vue'

interface ProgressEvent {
  percentage: number
  message: string
  status: 'PROCESSING' | 'COMPLETED' | 'ERROR'
}

const STORAGE_KEY = 'upload-process-id'
const MESSAGE_LOG_MAX_LENGTH = 1000

export const useSSE = () => {
  const eventSource = ref<EventSource | null>(null)
  const progress = ref(0)
  const message = ref('')
  const messageLog = ref<string[]>([])
  const isProcessing = ref(false)
  const status = ref<'PROCESSING' | 'COMPLETED' | 'ERROR'>('PROCESSING')
  const currentProcessId = ref<string | null>(null)

  const saveProcessId = (processId: string) => {
    localStorage.setItem(STORAGE_KEY, processId)
    currentProcessId.value = processId
  }

  const getProcessId = (): string | null => {
    return localStorage.getItem(STORAGE_KEY)
  }

  const clearProcessId = () => {
    localStorage.removeItem(STORAGE_KEY)
    currentProcessId.value = null
  }

  const connect = (processId: string) => {
    if (eventSource.value) {
      eventSource.value.close()
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL_V2 || 'http://localhost:3002'
    eventSource.value = new EventSource(`${baseUrl}/api/progress/subscribe/${processId}`)

    isProcessing.value = true
    saveProcessId(processId)

    eventSource.value.onmessage = (event) => {
      const data: ProgressEvent = JSON.parse(event.data)
      progress.value = data.percentage
      message.value = data.message
      messageLog.value.push(data.message)

      if (messageLog.value.length > MESSAGE_LOG_MAX_LENGTH) {
        messageLog.value.shift()
      }

      status.value = data.status

      if (data.status === 'COMPLETED' || data.status === 'ERROR') {
        disconnect()
        clearProcessId()
      }
    }

    eventSource.value.onerror = () => {
      disconnect()
      clearProcessId()
    }
  }

  const disconnect = () => {
    if (eventSource.value) {
      eventSource.value.close()
      eventSource.value = null
    }
    isProcessing.value = false
    messageLog.value = []
  }

  const resumeConnection = () => {
    const savedProcessId = getProcessId()
    if (savedProcessId) {
      connect(savedProcessId)
    }
  }

  const clearMessages = () => {
    messageLog.value = []
    message.value = ''
    progress.value = 0
  }

  return {
    connect,
    disconnect,
    resumeConnection,
    clearMessages,
    progress,
    message,
    messageLog,
    isProcessing,
    currentProcessId,
    status,
  }
}
