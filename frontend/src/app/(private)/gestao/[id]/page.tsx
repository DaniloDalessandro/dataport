"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Database,
  Table2,
  Calendar,
  User,
  Link as LinkIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Plus,
  Upload,
} from "lucide-react"
import { apiGet } from "@/lib/api"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"

interface DataImportProcess {
  id: number
  table_name: string
  endpoint_url: string
  status: string
  status_display: string
  record_count: number
  column_structure: Record<string, any>
  error_message: string | null
  created_at: string
  updated_at: string
  created_by_name: string | null
}

const statusConfig = {
  active: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    badge: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    borderColor: "border-green-200 dark:border-green-900/30"
  },
  inactive: {
    icon: XCircle,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-900/20",
    badge: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    borderColor: "border-gray-200 dark:border-gray-900/30"
  }
}

type ImportType = 'endpoint' | 'file'

export default function DatasetDetailsPage() {
  const params = useParams()
  const [dataset, setDataset] = useState<DataImportProcess | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAppendDialogOpen, setIsAppendDialogOpen] = useState(false)
  const [isAppending, setIsAppending] = useState(false)
  const [importType, setImportType] = useState<ImportType>('endpoint')
  const [endpointUrl, setEndpointUrl] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)
  const [dataPreview, setDataPreview] = useState<any>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  useEffect(() => {
    const fetchDataset = async () => {
      try {
        const data = await apiGet(`/api/data-import/processes/${params.id}/`)
        setDataset(data)
        setError(null)
        // Fetch data preview
        fetchDataPreview()
      } catch (err: any) {
        console.error("Error loading dataset:", err)
        setError(err.message || "Error loading data")
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchDataset()
    }
  }, [params.id])

  const fetchDataPreview = async () => {
    setIsLoadingPreview(true)
    try {
      const data = await apiGet(`/api/data-import/processes/${params.id}/preview/`)
      setDataPreview(data)
    } catch (err: any) {
      console.error("Error loading data preview:", err)
      setDataPreview(null)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!dataset) return

    setIsTogglingStatus(true)

    console.log('🔄 Tentando alterar status do dataset:', {
      datasetId: dataset.id,
      currentStatus: dataset.status,
      tableName: dataset.table_name
    })

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const token = localStorage.getItem('access_token')

      console.log('📡 Enviando requisição para:', `${API_BASE_URL}/api/data-import/processes/${dataset.id}/toggle-status/`)
      console.log('🔑 Token presente:', !!token)

      const response = await fetch(`${API_BASE_URL}/api/data-import/processes/${dataset.id}/toggle-status/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('📥 Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Erro na resposta:', errorData)
        throw new Error(errorData.error || errorData.detail || 'Erro ao alterar status')
      }

      const data = await response.json()
      console.log('✅ Resposta recebida:', data)

      if (data.success) {
        toast.success(data.message || 'Status alterado com sucesso!')
        setDataset(data.process)
        console.log('✅ Status atualizado:', data.process.status)
      } else {
        toast.error(data.error || "Erro ao alterar status")
      }
    } catch (error: any) {
      console.error("❌ Erro ao alterar status:", error)
      toast.error(error.message || "Erro ao alterar status. Verifique o console para mais detalhes.")
    } finally {
      setIsTogglingStatus(false)
    }
  }

  const handleAppendData = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!dataset) return

    // Validation
    if (importType === 'endpoint' && !endpointUrl) {
      toast.error("Por favor, informe a URL do endpoint")
      return
    }

    if (importType === 'file' && !selectedFile) {
      toast.error("Por favor, selecione um arquivo")
      return
    }

    setIsAppending(true)

    try {
      let data

      if (importType === 'endpoint') {
        // Send as JSON for endpoint import
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${API_BASE_URL}/api/data-import/processes/${dataset.id}/append/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({
            import_type: 'endpoint',
            endpoint_url: endpointUrl,
            table_name: dataset.table_name,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || errorData.detail || 'Erro ao adicionar dados')
        }

        data = await response.json()
      } else {
        // Send as FormData for file upload
        const formData = new FormData()
        formData.append('import_type', 'file')
        formData.append('table_name', dataset.table_name)
        if (selectedFile) {
          formData.append('file', selectedFile)
        }

        const token = localStorage.getItem('access_token')
        if (!token) {
          throw new Error('Token de autenticação não encontrado')
        }

        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${API_BASE_URL}/api/data-import/processes/${dataset.id}/append/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || errorData.detail || 'Erro ao adicionar dados')
        }

        data = await response.json()
      }

      if (data.success) {
        // Show detailed message with statistics if available
        if (data.statistics) {
          const stats = data.statistics
          let detailedMessage = `${stats.inserted} registros adicionados`

          if (stats.duplicates > 0) {
            detailedMessage += ` | ${stats.duplicates} duplicatas ignoradas`
          }

          if (stats.errors > 0) {
            detailedMessage += ` | ${stats.errors} erros`
          }

          // Use warning toast if there were duplicates
          if (stats.duplicates > 0) {
            toast.warning(detailedMessage, { duration: 6000 })
          } else {
            toast.success(detailedMessage, { duration: 5000 })
          }
        } else {
          toast.success(data.message || "Dados adicionados com sucesso!")
        }

        // Update dataset with new data
        setDataset(data.process)
        // Refresh data preview
        fetchDataPreview()
        // Reset form
        setEndpointUrl("")
        setSelectedFile(null)
        setIsAppendDialogOpen(false)
      } else {
        toast.error(data.error || "Erro ao adicionar dados")
      }
    } catch (error: any) {
      console.error("Error appending data:", error)
      toast.error(error.message || "Erro ao adicionar dados")
    } finally {
      setIsAppending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="w-full py-4 px-6">
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-sm text-muted-foreground">Loading dataset details...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !dataset) {
    return (
      <div className="w-full py-4 px-6">
        <Card className="border-destructive">
          <CardContent className="py-16 text-center">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-destructive font-medium">{error || "Dataset not found"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const config = statusConfig[dataset.status as keyof typeof statusConfig] || statusConfig.active
  const StatusIcon = config.icon
  const columns = Object.entries(dataset.column_structure || {})

  return (
    <div className="w-full py-4 px-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
            <Database className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{dataset.table_name}</h1>
            <p className="text-sm text-muted-foreground">Detalhes do Dataset</p>
          </div>
        </div>
        <Badge className={`${config.badge} ml-auto`} variant="secondary">
          <StatusIcon className="h-4 w-4 mr-1.5" />
          {dataset.status_display}
        </Badge>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleToggleStatus}
            disabled={isTogglingStatus}
            variant="outline"
            className={dataset.status === 'active' ? 'border-gray-300' : 'border-green-300'}
          >
            {isTogglingStatus ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Alterando...
              </>
            ) : dataset.status === 'active' ? (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Desativar
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Ativar
              </>
            )}
          </Button>
          <Dialog open={isAppendDialogOpen} onOpenChange={setIsAppendDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Dados
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Adicionar Mais Dados</DialogTitle>
                <DialogDescription>
                  Adicione mais registros à tabela {dataset.table_name}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAppendData} className="space-y-4">
                {/* Import Type Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Tipo de Importação</Label>
                  <RadioGroup
                    value={importType}
                    onValueChange={(value) => setImportType(value as ImportType)}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <RadioGroupItem
                        value="endpoint"
                        id="append-endpoint-type"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="append-endpoint-type"
                        className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                      >
                        <LinkIcon className="mb-3 h-6 w-6" />
                        <div className="space-y-1 text-center">
                          <p className="text-sm font-medium leading-none">Endpoint URL</p>
                          <p className="text-xs text-muted-foreground">Importar de API</p>
                        </div>
                      </Label>
                    </div>

                    <div>
                      <RadioGroupItem
                        value="file"
                        id="append-file-type"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="append-file-type"
                        className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                      >
                        <Upload className="mb-3 h-6 w-6" />
                        <div className="space-y-1 text-center">
                          <p className="text-sm font-medium leading-none">Arquivo</p>
                          <p className="text-xs text-muted-foreground">Excel ou CSV</p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Endpoint URL Input */}
                {importType === 'endpoint' && (
                  <div className="space-y-2">
                    <Label htmlFor="append-endpoint">Endpoint URL</Label>
                    <Input
                      id="append-endpoint"
                      type="url"
                      placeholder="https://api.example.com/data"
                      value={endpointUrl}
                      onChange={(e) => setEndpointUrl(e.target.value)}
                      disabled={isAppending}
                      required={importType === 'endpoint'}
                    />
                  </div>
                )}

                {/* File Upload Input */}
                {importType === 'file' && (
                  <div className="space-y-2">
                    <Label htmlFor="append-file">Selecionar Arquivo</Label>
                    <Input
                      id="append-file"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      disabled={isAppending}
                      required={importType === 'file'}
                    />
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isAppending}>
                  {isAppending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Dados
                    </>
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Detalhes da Importação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalhes da Importação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estatísticas principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Registros</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {dataset.record_count.toLocaleString()}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Colunas</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {columns.length}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Criado em</p>
              <p className="text-sm font-medium">
                {format(new Date(dataset.created_at), "dd/MM/yyyy", { locale: enUS })}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(dataset.created_at), "HH:mm:ss", { locale: enUS })}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Atualizado em</p>
              <p className="text-sm font-medium">
                {format(new Date(dataset.updated_at), "dd/MM/yyyy", { locale: enUS })}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(dataset.updated_at), "HH:mm:ss", { locale: enUS })}
              </p>
            </div>
          </div>

          {/* Informações detalhadas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <LinkIcon className="h-4 w-4" />
                Fonte de Dados
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-mono text-sm break-all">{dataset.endpoint_url}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Table2 className="h-4 w-4" />
                Nome da Tabela
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-mono text-sm">{dataset.table_name}</p>
              </div>
            </div>

            {dataset.created_by_name && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  Criado por
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">{dataset.created_by_name}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Status
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <Badge className={config.badge} variant="secondary">
                  <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
                  {dataset.status_display}
                </Badge>
              </div>
            </div>
          </div>

          {dataset.error_message && (
            <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                    Erro na Importação
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed">
                    {dataset.error_message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Column Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estrutura de Colunas</CardTitle>
          <p className="text-sm text-muted-foreground">
            Definição de esquema para {columns.length} colunas
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Column Name</TableHead>
                <TableHead>Data Type</TableHead>
                <TableHead>Sample Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columns.length > 0 ? (
                columns.map(([columnName, columnData], index) => (
                  <TableRow key={columnName}>
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-mono font-semibold">
                      {columnName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{columnData.type || "unknown"}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {columnData.sample ? String(columnData.sample) : "-"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No column structure available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prévia dos Dados</CardTitle>
          <p className="text-sm text-muted-foreground">
            {dataPreview && dataPreview.data ? (
              <>Mostrando {dataPreview.data.length} de {dataset.record_count.toLocaleString()} registros totais</>
            ) : (
              <>Total de registros: {dataset.record_count.toLocaleString()}</>
            )}
          </p>
        </CardHeader>
        <CardContent>
          {isLoadingPreview ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-muted-foreground">Loading preview...</span>
            </div>
          ) : dataPreview && dataPreview.data && dataPreview.data.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    {dataPreview.columns.map((col: string) => (
                      <TableHead key={col} className="font-mono">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataPreview.data.map((row: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      {dataPreview.columns.map((col: string) => (
                        <TableCell key={col} className="font-mono text-sm">
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No data available to preview</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
