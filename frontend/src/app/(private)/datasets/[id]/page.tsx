"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Database, Calendar, FileText, Link as LinkIcon, ArrowLeft, Upload, X, RefreshCw, Hash, Columns3 } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Dataset {
  id: number
  table_name: string
  status: string
  status_display: string
  record_count: number
  column_structure: Record<string, any>
  created_at: string
  updated_at: string
}

export default function DatasetDetailsPage() {
  const params = useParams()
  const { id } = params
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [dataPreview, setDataPreview] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadDataset = async () => {
    setIsLoading(true)
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const token = localStorage.getItem('access_token')

      // Fetch dataset details
      const response = await fetch(`${API_BASE_URL}/api/data-import/processes/${id}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setDataset(data)

        // Fetch data preview
        const previewResponse = await fetch(`${API_BASE_URL}/api/data-import/processes/${id}/preview/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (previewResponse.ok) {
          const previewData = await previewResponse.json()
          setDataPreview(previewData.data || [])
        }
      } else {
        toast.error('Dataset não encontrado')
        setDataset(null)
      }
    } catch (error) {
      console.error('Error loading dataset:', error)
      toast.error('Erro ao carregar dataset')
      setDataset(null)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (id) {
      loadDataset()
    }
  }, [id])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadDataset()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const validExtensions = ['.xls', '.xlsx', '.csv']
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

      if (validExtensions.includes(fileExtension)) {
        setSelectedFile(file)
      } else {
        alert('Por favor, selecione apenas arquivos XLS, XLSX ou CSV')
        event.target.value = ''
      }
    }
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !dataset) return

    setIsUploading(true)

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const token = localStorage.getItem('access_token')

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('process_id', id as string)

      const response = await fetch(`${API_BASE_URL}/api/data-import/append/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`${data.records_added || 0} registros adicionados com sucesso!`)
        setIsUploadDialogOpen(false)
        setSelectedFile(null)
        loadDataset() // Reload dataset
      } else {
        toast.error(data.error || 'Erro ao carregar arquivo')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Erro ao carregar arquivo')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancelUpload = () => {
    setIsUploadDialogOpen(false)
    setSelectedFile(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "archived":
        return "bg-gray-100 text-gray-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo"
      case "archived":
        return "Arquivado"
      case "processing":
        return "Processando"
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Carregando detalhes do dataset...</span>
      </div>
    )
  }

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Database className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Dataset não encontrado
        </h3>
        <p className="text-gray-500 mb-4">
          O dataset que você está procurando não existe ou foi removido.
        </p>
        <Button onClick={() => window.close()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Fechar
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Database className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{dataset.table_name}</h1>
              <div className="flex items-center gap-3 mt-3">
                <Badge className={getStatusColor(dataset.status)}>
                  {getStatusLabel(dataset.status)}
                </Badge>
                <span className="text-sm text-gray-500">
                  ID: {dataset.id}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Carregar Mais Dados
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </Button>
            <Button variant="outline" onClick={() => window.close()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Fechar
            </Button>
          </div>
        </div>

        {/* Informações Gerais */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Total de Registros</p>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-gray-400" />
                  <p className="text-lg font-semibold">{dataset.record_count.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Total de Colunas</p>
                <div className="flex items-center gap-2">
                  <Columns3 className="h-4 w-4 text-gray-400" />
                  <p className="text-lg font-semibold">{Object.keys(dataset.column_structure || {}).length}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Última Atualização</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <p className="text-lg font-semibold">
                    {new Date(dataset.updated_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Data de Criação</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <p className="text-lg font-semibold">
                    {new Date(dataset.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Status</p>
                <Badge className={getStatusColor(dataset.status)}>
                  {getStatusLabel(dataset.status)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prévia dos Dados */}
        <Card>
          <CardHeader>
            <CardTitle>Prévia dos Dados (primeiras linhas)</CardTitle>
          </CardHeader>
          <CardContent>
            {dataPreview.length === 0 ? (
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum dado disponível</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        {Object.keys(dataPreview[0]).map((key) => (
                          <TableHead key={key} className="font-semibold">
                            {key}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataPreview.map((row: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium text-gray-400">{index + 1}</TableCell>
                          {Object.values(row).map((value: any, i: number) => (
                            <TableCell key={i}>
                              {value !== null && value !== undefined ? String(value) : '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Mostrando {dataPreview.length} de {dataset.record_count.toLocaleString()} registros
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Upload de Mais Dados */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Carregar Mais Dados</DialogTitle>
            <DialogDescription>
              Faça upload de um arquivo para adicionar mais dados ao dataset "{dataset.table_name}"
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit}>
            <div className="grid gap-4 py-4">
              {/* Campo Upload de Arquivo */}
              <div className="grid gap-2">
                <Label htmlFor="upload-file">
                  Selecione o Arquivo
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Input
                      id="upload-file"
                      type="file"
                      accept=".xls,.xlsx,.csv"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Formatos aceitos: XLS, XLSX, CSV
                  </p>
                  {selectedFile && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                      <Upload className="h-5 w-5 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-blue-900 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-blue-700">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                        className="h-8 w-8 p-0 hover:bg-blue-100"
                      >
                        <X className="h-4 w-4 text-blue-600" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Informações sobre o upload */}
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Informações:
                </h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Os dados do arquivo serão adicionados ao dataset existente</li>
                  <li>• Certifique-se de que as colunas correspondam ao formato atual</li>
                  <li>• Registros duplicados serão identificados automaticamente</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelUpload}
                disabled={isUploading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Carregando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Carregar Arquivo
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
