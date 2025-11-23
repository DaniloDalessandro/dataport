import { apiGet } from './api'

export interface DashboardMetrics {
  total_datasets: number
  active_datasets: number
  total_records: number
  storage_tb: number
  storage_percent: number
  growth_rate: number
}

export interface DatasetStatus {
  name: string
  value: number
  color: string
}

export interface MonthlyVolume {
  month: string
  value: number
  datasets: number
}

export interface DashboardSummary {
  avg_monthly_volume: number
  active_percentage: number
}

export interface DashboardStats {
  metrics: DashboardMetrics
  dataset_status: DatasetStatus[]
  monthly_volume: MonthlyVolume[]
  summary: DashboardSummary
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const response = await apiGet('/api/data-import/dashboard-stats/')
    return response.data
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    throw error
  }
}
