"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"
import {
  Database,
  HardDrive,
  TrendingUp,
  Clock,
  Maximize2,
  X,
  FileText
} from "lucide-react"
import { getDashboardStats, type DashboardStats } from "@/lib/dashboard-service"

interface ChartStates {
  [key: string]: { fullscreen: boolean }
}

interface ChartCardProps {
  title: string
  description?: string
  children: React.ReactNode
  chartKey: string
  chartStates: ChartStates
  onToggleFullscreen: (chartKey: string) => void
  height?: number
}

function ChartCard({
  title,
  description,
  children,
  chartKey,
  chartStates,
  onToggleFullscreen,
  height = 350
}: ChartCardProps) {
  const isFullscreen = chartStates[chartKey]?.fullscreen || false

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">{title}</CardTitle>
            {description && <CardDescription className="text-sm mt-1">{description}</CardDescription>}
          </div>
          <Dialog open={isFullscreen} onOpenChange={() => onToggleFullscreen(chartKey)}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleFullscreen(chartKey)}
              className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              title="Visualizar em tela cheia"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <DialogContent className="!max-w-none !w-screen !h-screen !p-0 !m-0 !rounded-none !border-0 !bg-white !top-0 !left-0 !translate-x-0 !translate-y-0 !fixed !inset-0 !z-50" hideClose>
              <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="flex-shrink-0 p-6 pb-4 border-b bg-white shadow-sm">
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-2xl font-semibold text-gray-900">{title}</DialogTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleFullscreen(chartKey)}
                      className="h-10 w-10 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full"
                      title="Fechar tela cheia"
                    >
                      <X className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 p-8 overflow-hidden">
                  <div className="h-full bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                    <ResponsiveContainer width="100%" height="100%">
                      {children}
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {children}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [chartStates, setChartStates] = useState<ChartStates>({})
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toggleFullscreen = (chartKey: string) => {
    setChartStates(prev => ({
      ...prev,
      [chartKey]: {
        fullscreen: !(prev[chartKey]?.fullscreen || false)
      }
    }))
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)
        const stats = await getDashboardStats()
        setDashboardData(stats)
        setError(null)
      } catch (err) {
        console.error('Error loading dashboard data:', err)
        setError('Erro ao carregar dados do dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
        {/* Loading skeletons */}
        <div className="grid gap-8 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-gray-200">
              <CardContent className="p-8">
                <div className="animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-10 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="border-gray-200">
              <CardContent className="p-8">
                <div className="animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-6"></div>
                  <div className="h-80 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="flex flex-col gap-8 p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-8">
            <p className="text-red-600">{error || 'Erro ao carregar dados'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { metrics, dataset_status, monthly_volume, summary } = dashboardData

  return (
    <div className="flex flex-col gap-8 p-8 max-h-screen overflow-y-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-base text-gray-600 mt-2">Visão geral do sistema DataDock</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg">
          <Clock className="h-4 w-4" />
          Atualizado agora
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-8 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-white hover:shadow-xl transition-all duration-300">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-base font-medium text-gray-600 mb-1">Datasets Ativos</p>
                <div className="flex items-baseline gap-3 mt-3">
                  <h3 className="text-5xl font-bold text-gray-900">{metrics.active_datasets}</h3>
                  {metrics.growth_rate > 0 && (
                    <span className="flex items-center text-base text-green-600 font-medium">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +{metrics.growth_rate}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-3">vs. mês anterior</p>
              </div>
              <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center">
                <Database className="h-10 w-10 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-white hover:shadow-xl transition-all duration-300">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-base font-medium text-gray-600 mb-1">Registros Totais</p>
                <div className="flex items-baseline gap-3 mt-3">
                  <h3 className="text-5xl font-bold text-gray-900">
                    {metrics.total_records >= 1000000
                      ? `${(metrics.total_records / 1000000).toFixed(1)}M`
                      : metrics.total_records >= 1000
                      ? `${(metrics.total_records / 1000).toFixed(1)}K`
                      : metrics.total_records}
                  </h3>
                  {metrics.growth_rate > 0 && (
                    <span className="flex items-center text-base text-green-600 font-medium">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +{metrics.growth_rate}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-3">vs. mês anterior</p>
              </div>
              <div className="h-20 w-20 bg-purple-100 rounded-full flex items-center justify-center">
                <FileText className="h-10 w-10 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-white hover:shadow-xl transition-all duration-300">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-base font-medium text-gray-600 mb-1">Armazenamento</p>
                <div className="flex items-baseline gap-3 mt-3">
                  <h3 className="text-5xl font-bold text-gray-900">{metrics.storage_tb.toFixed(2)}</h3>
                  <span className="text-lg text-gray-600">TB</span>
                </div>
                <p className="text-sm text-gray-500 mt-3">{metrics.storage_percent}% utilizado do total disponível</p>
              </div>
              <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                <HardDrive className="h-10 w-10 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid gap-8 lg:grid-cols-2">
        <ChartCard
          title="Volume de Dados Mensal"
          description="Evolução do volume de dados armazenados ao longo dos meses (em GB)"
          chartKey="monthlyVolume"
          chartStates={chartStates}
          onToggleFullscreen={toggleFullscreen}
        >
          <AreaChart data={monthly_volume}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeWidth={1} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 13, fill: '#6b7280' }}
              stroke="#9ca3af"
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              tick={{ fontSize: 13, fill: '#6b7280' }}
              stroke="#9ca3af"
              tickLine={false}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '14px',
                padding: '12px 16px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              formatter={(value: number, _name: string) => [`${value} GB`, 'Volume Total']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#colorValue)"
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7 }}
            />
          </AreaChart>
        </ChartCard>

        <ChartCard
          title="Distribuição por Status"
          description="Proporção de datasets categorizados por seu status atual"
          chartKey="datasetStatus"
          chartStates={chartStates}
          onToggleFullscreen={toggleFullscreen}
        >
          <PieChart>
            <Pie
              data={dataset_status}
              cx="50%"
              cy="50%"
              labelLine={{
                stroke: '#9ca3af',
                strokeWidth: 2
              }}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
              stroke="#fff"
              strokeWidth={2}
            >
              {dataset_status.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                fontSize: '14px',
                padding: '12px 16px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              formatter={(value: number, name: string) => [`${value} datasets`, name]}
            />
          </PieChart>
        </ChartCard>
      </div>

      {/* Additional Info Card */}
      <Card className="border-gray-200 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-gray-50 to-white">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">Resumo Rápido</CardTitle>
          <CardDescription className="text-base">Principais indicadores do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-white rounded-lg border border-gray-100">
              <p className="text-sm font-medium text-gray-600 mb-2">Taxa de Crescimento</p>
              <p className="text-3xl font-bold text-green-600">+{metrics.growth_rate}%</p>
              <p className="text-xs text-gray-500 mt-2">nos últimos 30 dias</p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg border border-gray-100">
              <p className="text-sm font-medium text-gray-600 mb-2">Média de Volume</p>
              <p className="text-3xl font-bold text-blue-600">{summary.avg_monthly_volume.toFixed(0)}K GB</p>
              <p className="text-xs text-gray-500 mt-2">por mês</p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg border border-gray-100">
              <p className="text-sm font-medium text-gray-600 mb-2">Total de Datasets</p>
              <p className="text-3xl font-bold text-purple-600">{metrics.total_datasets}</p>
              <p className="text-xs text-gray-500 mt-2">{metrics.active_datasets} ativos, {metrics.total_datasets - metrics.active_datasets} inativos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
