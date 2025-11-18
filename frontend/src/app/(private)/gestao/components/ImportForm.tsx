"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "sonner"
import { Loader2, Database, Upload, Link as LinkIcon, FileSpreadsheet, X } from "lucide-react"
import { apiPost } from "@/lib/api"

interface ImportFormProps {
  onImportSuccess: (newProcess?: any) => void
}

type ImportType = 'endpoint' | 'file'

export function ImportForm({ onImportSuccess }: ImportFormProps) {
  const [importType, setImportType] = useState<ImportType>('endpoint')
  const [endpointUrl, setEndpointUrl] = useState("")
  const [tableName, setTableName] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validExtensions = ['.xlsx', '.xls', '.csv']
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

      if (!validExtensions.includes(fileExtension)) {
        toast.error(`Formato de arquivo não suportado. Use: ${validExtensions.join(', ')}`)
        return
      }

      setSelectedFile(file)

      // Auto-populate table name from file name if empty
      if (!tableName) {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'))
        const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
        setTableName(sanitized)
      }
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!tableName) {
      toast.error("Por favor, informe o nome da tabela")
      return
    }

    if (importType === 'endpoint' && !endpointUrl) {
      toast.error("Por favor, informe a URL do endpoint")
      return
    }

    if (importType === 'file' && !selectedFile) {
      toast.error("Por favor, selecione um arquivo")
      return
    }

    setIsLoading(true)

    try {
      let data

      if (importType === 'endpoint') {
        // Send as JSON for endpoint import
        data = await apiPost("/api/data-import/", {
          import_type: 'endpoint',
          endpoint_url: endpointUrl,
          table_name: tableName,
        })
      } else {
        // Send as FormData for file upload
        const formData = new FormData()
        formData.append('import_type', 'file')
        formData.append('table_name', tableName)
        if (selectedFile) {
          formData.append('file', selectedFile)
        }

        // Use fetch directly for FormData with proper token handling
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const token = localStorage.getItem('access_token')

        if (!token) {
          throw new Error('Token de autenticação não encontrado')
        }

        const response = await fetch(`${API_BASE_URL}/api/data-import/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || errorData.detail || 'Erro ao importar arquivo')
        }

        data = await response.json()
      }

      if (data.success) {
        // Show detailed message if statistics are available
        if (data.statistics) {
          const stats = data.statistics
          let detailedMessage = `${stats.inserted} registros inseridos`
          if (stats.duplicates > 0) {
            detailedMessage += ` | ${stats.duplicates} duplicatas ignoradas`
          }
          if (stats.errors > 0) {
            detailedMessage += ` | ${stats.errors} erros`
          }
          toast.success(detailedMessage, { duration: 5000 })
        } else {
          toast.success(data.message || "Dados importados com sucesso!")
        }

        // Reset form
        setEndpointUrl("")
        setTableName("")
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        // Pass the new process to the parent
        onImportSuccess(data.process)
      } else {
        // Show detailed error message
        const errorMsg = data.error || "Erro ao importar dados"
        console.error("Import error:", {
          error: data.error,
          error_type: data.error_type,
          details: data.details,
          traceback: data.traceback
        })

        toast.error(errorMsg, {
          duration: 5000,
          description: data.error_type ? `Tipo: ${data.error_type}` : undefined
        })
      }
    } catch (error: any) {
      console.error("Error:", error)

      // Try to extract more info from the error
      let errorMessage = "Erro ao conectar com o servidor"
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      }

      toast.error(errorMessage, {
        duration: 5000
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 py-4">
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
              id="endpoint-type"
              className="peer sr-only"
            />
            <Label
              htmlFor="endpoint-type"
              className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
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
              id="file-type"
              className="peer sr-only"
            />
            <Label
              htmlFor="file-type"
              className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
            >
              <FileSpreadsheet className="mb-3 h-6 w-6" />
              <div className="space-y-1 text-center">
                <p className="text-sm font-medium leading-none">Arquivo</p>
                <p className="text-xs text-muted-foreground">Excel ou CSV</p>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Endpoint URL Input (shown only when endpoint is selected) */}
      {importType === 'endpoint' && (
        <div className="space-y-2">
          <Label htmlFor="endpoint" className="text-sm font-medium">
            Endpoint URL
          </Label>
          <Input
            id="endpoint"
            type="url"
            placeholder="https://api.example.com/data"
            value={endpointUrl}
            onChange={(e) => setEndpointUrl(e.target.value)}
            disabled={isLoading}
            required={importType === 'endpoint'}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <span className="text-blue-600 dark:text-blue-400 font-medium">•</span>
            Deve retornar dados em formato JSON
          </p>
        </div>
      )}

      {/* File Upload Input (shown only when file is selected) */}
      {importType === 'file' && (
        <div className="space-y-2">
          <Label htmlFor="file" className="text-sm font-medium">
            Selecionar Arquivo
          </Label>

          {!selectedFile ? (
            <div className="relative">
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={isLoading}
                className="h-11 cursor-pointer"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/20 rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-900 dark:text-green-100 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
                disabled={isLoading}
                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <span className="text-blue-600 dark:text-blue-400 font-medium">•</span>
            Formatos suportados: .xlsx, .xls, .csv
          </p>
        </div>
      )}

      {/* Table Name Input */}
      <div className="space-y-2">
        <Label htmlFor="tableName" className="text-sm font-medium">
          Nome da Tabela
        </Label>
        <Input
          id="tableName"
          type="text"
          placeholder="minha_tabela"
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          disabled={isLoading}
          required
          className="h-11 font-mono"
        />
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <span className="text-blue-600 dark:text-blue-400 font-medium">•</span>
          Apenas letras, números e underscore
        </p>
      </div>

      {/* Quick Test Hint (only for endpoint) */}
      {importType === 'endpoint' && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-lg">
          <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">
            💡 Teste Rápido
          </p>
          <code className="text-xs text-blue-700 dark:text-blue-300 break-all">
            https://jsonplaceholder.typicode.com/users
          </code>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          type="submit"
          className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-base font-medium shadow-md hover:shadow-lg transition-all duration-200"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importando Dados...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Iniciar Importação
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
