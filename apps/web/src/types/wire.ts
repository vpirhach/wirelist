export interface Wire {
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
