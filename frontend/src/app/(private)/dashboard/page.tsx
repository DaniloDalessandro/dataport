"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts"
import {
  Users,
  FileText,
  DollarSign,
  Heart,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

// Mock data for charts - Data Management Context
const datasetStatusData = [
  { name: 'Ativos', value: 45, color: '#10b981' },
  { name: 'Arquivados', value: 12, color: '#ef4444' },
  { name: 'Em Processamento', value: 8, color: '#f59e0b' },
  { name: 'Pendentes', value: 3, color: '#6b7280' },
]

const monthlyDataVolume = [
  { month: 'Jan', value: 245000, datasets: 12 },
  { month: 'Fev', value: 280000, datasets: 15 },
  { month: 'Mar', value: 320000, datasets: 18 },
  { month: 'Abr', value: 290000, datasets: 14 },
  { month: 'Mai', value: 350000, datasets: 21 },
  { month: 'Jun', value: 420000, datasets: 25 },
]

const storageUtilizationData = [
  { category: 'Logs', utilizado: 2800, total: 4000 },
  { category: 'Analytics', utilizado: 1500, total: 2200 },
  { category: 'Transacional', utilizado: 800, total: 1200 },
  { category: 'Backup', utilizado: 600, total: 1000 },
  { category: 'Arquivos', utilizado: 400, total: 800 },
]

const dataActivityTimeline = [
  { month: 'Jan', importados: 5, processados: 3, exportados: 2 },
  { month: 'Fev', importados: 8, processados: 4, exportados: 1 },
  { month: 'Mar', importados: 12, processados: 2, exportados: 3 },
  { month: 'Abr', importados: 6, processados: 5, exportados: 4 },
  { month: 'Mai', importados: 10, processados: 3, exportados: 2 },
  { month: 'Jun', importados: 15, processados: 6, exportados: 5 },
]

// Format currency in Brazilian Real
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Format percentage
const formatPercentage = (value: number, total: number) => {
  return `${Math.round((value / total) * 100)}%`
}

// Interfaces for chart fullscreen state
interface ChartStates {
  contractStatus: { fullscreen: boolean }
  monthlyValues: { fullscreen: boolean }
  budgetUtilization: { fullscreen: boolean }
  contractTimeline: { fullscreen: boolean }
}

// Chart Card Wrapper Component
interface ChartCardProps {
  title: string
  children: React.ReactNode
  chartKey: keyof ChartStates
  chartStates: ChartStates
  onToggleFullscreen: (chartKey: keyof ChartStates) => void
}

function ChartCard({
  title,
  children,
  chartKey,
  chartStates,
  onToggleFullscreen
}: ChartCardProps) {
  const isFullscreen = chartStates[chartKey].fullscreen

  return (
    <>
      <Card>
        <CardHeader className="p-3 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            <Dialog open={isFullscreen} onOpenChange={() => onToggleFullscreen(chartKey)}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors"
                  title="Tela cheia"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="!max-w-none !w-screen !h-screen !p-0 !m-0 !rounded-none !border-0 !bg-white !top-0 !left-0 !translate-x-0 !translate-y-0 !fixed !inset-0 !z-50" hideClose>
                <div className="h-screen w-screen flex flex-col bg-white">
                  <div className="flex-shrink-0 p-6 pb-4 border-b bg-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <DialogTitle className="text-2xl font-semibold text-gray-900">{title}</DialogTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleFullscreen(chartKey)}
                        className="h-10 w-10 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                        title="Fechar tela cheia"
                      >
                        <X className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 p-8 bg-gray-50 overflow-hidden">
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
        <CardContent className="p-3 pt-0">
          <ResponsiveContainer width="100%" height={130}>
            {children}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  )
}

export default function Page() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [chartStates, setChartStates] = useState<ChartStates>({
    contractStatus: { fullscreen: false },
    monthlyValues: { fullscreen: false },
    budgetUtilization: { fullscreen: false },
    contractTimeline: { fullscreen: false },
  })

  const totalPages = 3


  // Toggle fullscreen state for a chart
  const toggleFullscreen = (chartKey: keyof ChartStates) => {
    setChartStates(prev => ({
      ...prev,
      [chartKey]: {
        ...prev[chartKey],
        fullscreen: !prev[chartKey].fullscreen
      }
    }))
  }

  // Navigation functions
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Render page content based on current page
  const renderPageContent = () => {
    switch (currentPage) {
      case 1:
        return (
          <div className="h-full flex flex-col gap-2 overflow-hidden">
            {/* Metrics Cards */}
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4 flex-shrink-0">
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">Datasets</p>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xl font-bold">68</h3>
                        <span className="text-xs text-green-600 font-medium">+12%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">Operadores</p>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xl font-bold">156</h3>
                        <span className="text-xs text-green-600 font-medium">+5%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">Armazenamento</p>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-bold">18,75 TB</h3>
                        <span className="text-xs text-green-600 font-medium">+8%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">Processamentos</p>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xl font-bold">42</h3>
                        <span className="text-xs text-red-500 font-medium">-3%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Charts */}
            <div className="flex-1 min-h-0 grid gap-2 md:grid-cols-2">
              {/* Dataset Status Distribution */}
              <ChartCard
                title="Distribuição de Status dos Datasets"
                chartKey="contractStatus"
                chartStates={chartStates}
                onToggleFullscreen={toggleFullscreen}
              >
                <PieChart>
                  <Pie
                    data={datasetStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={50}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {datasetStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ChartCard>

              {/* Monthly Data Volume */}
              <ChartCard
                title="Volume de Dados Mensal (GB)"
                chartKey="monthlyValues"
                chartStates={chartStates}
                onToggleFullscreen={toggleFullscreen}
              >
                <AreaChart data={monthlyDataVolume}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} width={40} />
                  <Tooltip
                    contentStyle={{ fontSize: '11px' }}
                    formatter={(value, name) => [
                      name === 'value' ? `${value} GB` : value,
                      name === 'value' ? 'Volume Total' : 'Datasets'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartCard>
            </div>
          </div>
        )
      
      case 2:
        return (
          <div className="h-full flex flex-col gap-2 overflow-hidden">
            {/* Secondary Charts */}
            <div className="flex-1 min-h-0 grid gap-2 md:grid-cols-2">
              {/* Storage Utilization */}
              <ChartCard
                title="Utilização de Armazenamento por Categoria (GB)"
                chartKey="budgetUtilization"
                chartStates={chartStates}
                onToggleFullscreen={toggleFullscreen}
              >
                <BarChart data={storageUtilizationData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tickFormatter={(value) => `${(value / 1000).toFixed(1)}K`} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="category" type="category" width={70} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontSize: '11px' }}
                    formatter={(value, name) => [
                      `${value} GB`,
                      name === 'utilizado' ? 'Utilizado' : 'Total Disponível'
                    ]}
                  />
                  <Bar dataKey="total" fill="#e5e7eb" name="total" />
                  <Bar dataKey="utilizado" fill="#10b981" name="utilizado" />
                </BarChart>
              </ChartCard>

              {/* Data Activity Timeline */}
              <ChartCard
                title="Atividade de Dados por Mês"
                chartKey="contractTimeline"
                chartStates={chartStates}
                onToggleFullscreen={toggleFullscreen}
              >
                <LineChart data={dataActivityTimeline}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={25} />
                  <Tooltip contentStyle={{ fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line
                    type="monotone"
                    dataKey="importados"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Importados"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="processados"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Processados"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="exportados"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Exportados"
                    dot={false}
                  />
                </LineChart>
              </ChartCard>
            </div>

            {/* Pending Processing Summary */}
            <div className="flex-shrink-0">
              <Card>
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Processamentos Pendentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="grid gap-2 md:grid-cols-3">
                    <div className="flex justify-between items-center p-2 bg-amber-50 rounded">
                      <div>
                        <p className="font-medium text-xs">Dataset #2024-001</p>
                        <p className="text-xs text-muted-foreground">Há 2 horas</p>
                      </div>
                      <span className="text-amber-600 font-semibold text-xs">85 GB</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-amber-50 rounded">
                      <div>
                        <p className="font-medium text-xs">Dataset #2024-003</p>
                        <p className="text-xs text-muted-foreground">Há 4 horas</p>
                      </div>
                      <span className="text-amber-600 font-semibold text-xs">120 GB</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-amber-50 rounded">
                      <div>
                        <p className="font-medium text-xs">Dataset #2024-007</p>
                        <p className="text-xs text-muted-foreground">Há 6 horas</p>
                      </div>
                      <span className="text-amber-600 font-semibold text-xs">95 GB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="h-full flex flex-col gap-2 justify-center overflow-hidden">
            {/* Recently Processed Datasets + Performance Summary */}
            <div className="grid gap-2 md:grid-cols-2 max-w-6xl mx-auto w-full">
              <Card>
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Datasets Recém Processados
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <div>
                        <p className="font-medium text-xs">Dataset #2024-015</p>
                        <p className="text-xs text-muted-foreground">Processado hoje</p>
                      </div>
                      <span className="text-green-600 font-semibold text-xs">275 GB</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <div>
                        <p className="font-medium text-xs">Dataset #2024-016</p>
                        <p className="text-xs text-muted-foreground">Processado ontem</p>
                      </div>
                      <span className="text-green-600 font-semibold text-xs">150 GB</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <div>
                        <p className="font-medium text-xs">Dataset #2024-017</p>
                        <p className="text-xs text-muted-foreground">Há 2 dias</p>
                      </div>
                      <span className="text-green-600 font-semibold text-xs">89 GB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm font-semibold">Resumo de Performance</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-xs">
                        <span>Processamentos no Prazo</span>
                        <span className="font-medium">92%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs">
                        <span>Utilização de Armazenamento</span>
                        <span className="font-medium">78%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs">
                        <span>Qualidade dos Dados</span>
                        <span className="font-medium">87%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: '87%' }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.push("/")
    }

    // Simulate loading time
    const timer = setTimeout(() => setIsLoading(false), 1500)
    return () => clearTimeout(timer)
  }, [router])

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        
        {/* Loading skeletons */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden p-2 pt-0">
      {/* Page Content */}
      <div className="flex-1 min-h-0 overflow-hidden transition-all duration-300 ease-in-out">
        {renderPageContent()}
      </div>

      {/* Navigation */}
      <div className="flex-shrink-0 mt-2 border-t border-gray-200 pt-2">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Previous Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className="flex items-center gap-1 h-7 px-3 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          {/* Page Indicators */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, index) => {
              const pageNumber = index + 1
              return (
                <button
                  key={pageNumber}
                  onClick={() => goToPage(pageNumber)}
                  className={`w-7 h-7 rounded-full text-xs font-medium transition-all duration-200 ${
                    currentPage === pageNumber
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {pageNumber}
                </button>
              )
            })}
          </div>

          <div className="text-xs text-muted-foreground font-medium">
            {currentPage}/{totalPages}
          </div>

          {/* Next Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 h-7 px-3 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
