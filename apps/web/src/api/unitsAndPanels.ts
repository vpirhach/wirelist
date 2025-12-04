import axiosInstance from './axiosInstance'

/**
 * Unit and Panel API
 * Uses Node.js backend (v2)
 */

/**
 * Get all unit codes
 */
export const getUnits = async (): Promise<string[]> => {
  const response = await axiosInstance.get(`/unit-panels/units`)
  return response.data
}

/**
 * Get all panel codes
 */
export const getPanels = async (): Promise<string[]> => {
  const response = await axiosInstance.get(`/unit-panels/panels`)
  return response.data
}

/**
 * Get panel codes for a specific unit
 */
export const getPanelsByUnit = async (unitCode: string): Promise<string[]> => {
  const response = await axiosInstance.get(`/unit-panels/units/${unitCode}/panels`)
  return response.data
}
