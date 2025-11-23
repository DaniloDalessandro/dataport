"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Download, Database, Loader2, Table2, Calendar, Hash, Columns3, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ColumnFilterPopover, FilterValue } from "@/components/filters"

interface ColumnMetadata {
  name: string
  type: string
  filter_type: string
  unique_values: string[]
}

interface SearchResult {
  process_id: number
  table_name: string
  columns: string[]
  data: any[]
  count: number
}

interface PublicDataset {
  id: number
  table_name: string
  status: string
  status_display: string
  record_count: number
  column_structure: Record<string, any>
  created_at: string
}

export default function SitePublicoPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [datasets, setDatasets] = useState<PublicDataset[]>([])
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(true)
  const [selectedDataset, setSelectedDataset] = useState<PublicDataset | null>(null)
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [downloadFormat, setDownloadFormat] = useState<string>("csv")
  const [columnMetadata, setColumnMetadata] = useState<ColumnMetadata[]>([])
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterValue>>({})
  const [filteredData, setFilteredData] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredDatasets, setFilteredDatasets] = useState<PublicDataset[]>([])
  const [showAllDatasets, setShowAllDatasets] = useState(false)

  // Fetch public datasets on mount
  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${API_BASE_URL}/api/data-import/public-datasets/`)

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setDatasets(data.results || [])
          }
        }
      } catch (error) {
        console.error("Error fetching datasets:", error)
      } finally {
        setIsLoadingDatasets(false)
      }
    }

    fetchDatasets()
  }, [])

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value)

    if (value.trim()) {
      const filtered = datasets.filter(dataset =>
        dataset.table_name.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredDatasets(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setFilteredDatasets([])
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (dataset: PublicDataset) => {
    setShowSuggestions(false)
    setSearchQuery(dataset.table_name)
    handleCardClick(dataset)
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setShowSuggestions(false)

    if (!searchQuery.trim()) {
      toast.error("Digite um termo para buscar")
      return
    }

    setIsSearching(true)
    setIsModalOpen(true)

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_BASE_URL}/api/data-import/public-search/?q=${encodeURIComponent(searchQuery)}`)

      if (!response.ok) {
        throw new Error('Erro ao buscar dados')
      }

      const data = await response.json()

      if (data.success) {
        setSearchResults(data.results || [])
        if (data.results.length === 0) {
          toast.info("Nenhum resultado encontrado")
        }
      } else {
        toast.error(data.error || "Erro ao buscar dados")
        setSearchResults([])
      }
    } catch (error: any) {
      console.error("Search error:", error)
      toast.error(error.message || "Erro ao buscar dados")
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleDownload = async (processId: number, tableName: string) => {
    if (selectedColumns.length === 0) {
      toast.error("Selecione pelo menos uma coluna para download")
      return
    }

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      const columnsParam = selectedColumns.join(',')
      const response = await fetch(`${API_BASE_URL}/api/data-import/public-download/${processId}/?file_format=${downloadFormat}&columns=${encodeURIComponent(columnsParam)}`)

      if (!response.ok) {
        throw new Error('Erro ao baixar dados')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${tableName}.${downloadFormat}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Download iniciado!")
    } catch (error: any) {
      console.error("Download error:", error)
      toast.error(error.message || "Erro ao baixar dados")
    }
  }

  const toggleColumn = (column: string) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    )
  }

  const toggleAllColumns = (columns: string[]) => {
    if (selectedColumns.length === columns.length) {
      setSelectedColumns([])
    } else {
      setSelectedColumns(columns)
    }
  }

  const handleCardClick = async (dataset: PublicDataset) => {
    setSelectedDataset(dataset)
    setSearchResults([])
    setColumnMetadata([])
    setActiveFilters({})
    setFilteredData([])
    setIsModalOpen(true)
    setIsSearching(true)

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      // Fetch data and metadata in parallel
      const [dataResponse, metadataResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/data-import/public-data/${dataset.id}/`),
        fetch(`${API_BASE_URL}/api/data-import/public-metadata/${dataset.id}/`)
      ])

      if (!dataResponse.ok) {
        throw new Error('Erro ao buscar dados')
      }

      const data = await dataResponse.json()
      const metadata = metadataResponse.ok ? await metadataResponse.json() : null

      if (data.success) {
        // Set the result as an array with one item to match the existing structure
        setSearchResults([{
          process_id: data.process_id,
          table_name: data.table_name,
          columns: data.columns,
          data: data.data,
          count: data.count
        }])
        setFilteredData(data.data)
        // Initialize all columns as selected
        setSelectedColumns(data.columns || [])

        // Set metadata if available
        if (metadata && metadata.success) {
          setColumnMetadata(metadata.columns || [])
        }

        if (data.data.length === 0) {
          toast.info("Nenhum dado encontrado")
        }
      } else {
        toast.error(data.error || "Erro ao buscar dados")
        setSearchResults([])
      }
    } catch (error: any) {
      console.error("Search error:", error)
      toast.error(error.message || "Erro ao buscar dados")
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Apply filters to data
  const applyFilters = (data: any[], filters: Record<string, FilterValue>) => {
    if (Object.keys(filters).length === 0) {
      return data
    }

    return data.filter((row) => {
      for (const [column, filter] of Object.entries(filters)) {
        const value = row[column]
        const strValue = value !== null && value !== undefined ? String(value).toLowerCase() : ""

        switch (filter.type) {
          case "string":
            const filterVal = ((filter.value as string) || "").toLowerCase()
            switch (filter.operator) {
              case "contains":
                if (!strValue.includes(filterVal)) return false
                break
              case "equals":
                if (strValue !== filterVal) return false
                break
              case "starts_with":
                if (!strValue.startsWith(filterVal)) return false
                break
              case "ends_with":
                if (!strValue.endsWith(filterVal)) return false
                break
              case "not_contains":
                if (strValue.includes(filterVal)) return false
                break
              case "is_empty":
                if (strValue !== "") return false
                break
              case "is_not_empty":
                if (strValue === "") return false
                break
            }
            break

          case "integer":
          case "float":
          case "number":
            const numValue = parseFloat(strValue)
            const numFilter = parseFloat(filter.value as string)
            const numFilter2 = filter.value2 ? parseFloat(filter.value2) : null
            switch (filter.operator) {
              case "equals":
                if (numValue !== numFilter) return false
                break
              case "not_equals":
                if (numValue === numFilter) return false
                break
              case "greater_than":
                if (numValue <= numFilter) return false
                break
              case "less_than":
                if (numValue >= numFilter) return false
                break
              case "greater_or_equal":
                if (numValue < numFilter) return false
                break
              case "less_or_equal":
                if (numValue > numFilter) return false
                break
              case "between":
                if (numFilter2 !== null && (numValue < numFilter || numValue > numFilter2)) return false
                break
              case "is_empty":
                if (strValue !== "") return false
                break
              case "is_not_empty":
                if (strValue === "") return false
                break
            }
            break

          case "category":
            const selectedValues = filter.value as string[]
            if (selectedValues.length > 0 && !selectedValues.includes(String(value))) {
              return false
            }
            break

          case "boolean":
            const boolFilter = filter.value as string
            if (boolFilter === "true" && strValue !== "true") return false
            if (boolFilter === "false" && strValue !== "false") return false
            if (boolFilter === "empty" && strValue !== "") return false
            break

          case "date":
          case "datetime":
            // Simple date comparison
            const dateValue = new Date(value)
            const dateFilter = new Date(filter.value as string)
            const dateFilter2 = filter.value2 ? new Date(filter.value2) : null
            switch (filter.operator) {
              case "equals":
                if (dateValue.toDateString() !== dateFilter.toDateString()) return false
                break
              case "before":
                if (dateValue >= dateFilter) return false
                break
              case "after":
                if (dateValue <= dateFilter) return false
                break
              case "between":
                if (dateFilter2 && (dateValue < dateFilter || dateValue > dateFilter2)) return false
                break
            }
            break
        }
      }
      return true
    })
  }

  const handleFilterChange = (column: string, filter: FilterValue | null) => {
    const newFilters = { ...activeFilters }
    if (filter) {
      newFilters[column] = filter
    } else {
      delete newFilters[column]
    }
    setActiveFilters(newFilters)

    // Apply filters to data
    if (searchResults[0]?.data) {
      const filtered = applyFilters(searchResults[0].data, newFilters)
      setFilteredData(filtered)
    }
  }

  const getColumnMetadata = (columnName: string): ColumnMetadata | undefined => {
    return columnMetadata.find((col) => col.name === columnName)
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-sky-50 via-blue-50 to-cyan-100">
      {/* Ocean Wave Animation */}
      <div className="absolute bottom-0 left-0 right-0 h-64 overflow-hidden pointer-events-none">
        {/* Wave layers */}
        <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
          {/* Back wave - darkest */}
          <path
            className="wave-back"
            fill="#1e3a5f"
            fillOpacity="0.4"
            d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
          {/* Middle wave */}
          <path
            className="wave-middle"
            fill="#2563eb"
            fillOpacity="0.5"
            d="M0,256L48,240C96,224,192,192,288,181.3C384,171,480,181,576,197.3C672,213,768,235,864,224C960,213,1056,171,1152,165.3C1248,160,1344,192,1392,208L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
          {/* Front wave - lightest */}
          <path
            className="wave-front"
            fill="#3b82f6"
            fillOpacity="0.6"
            d="M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,229.3C672,245,768,267,864,261.3C960,256,1056,224,1152,213.3C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </svg>

        {/* Floating particles (bubbles) */}
        <div className="bubbles">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="bubble"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${4 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header - Maritime Theme */}
        <div className="flex flex-col items-center pt-20 pb-12">
          {/* Logo/Title - Blue Maritime */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4 mb-3">
              <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                <svg className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1H2v1Z"/>
                  <path d="M12 3L2 12h3v7h14v-7h3L12 3Z"/>
                  <path d="M12 8v4"/>
                  <path d="M10 12h4"/>
                </svg>
              </div>
              <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-800 via-blue-600 to-cyan-600 bg-clip-text text-transparent tracking-tight">
                DataDock
              </h1>
            </div>
            <p className="text-center text-blue-700 font-medium mt-2">
              Portal Público de Dados
            </p>
          </div>

          {/* Search bar - Maritime Theme */}
          <form onSubmit={handleSearch} className="w-full max-w-2xl px-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-400" />
              <Input
                type="text"
                placeholder="Buscar dados portuários..."
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onFocus={() => searchQuery.trim() && filteredDatasets.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full h-14 pl-12 pr-4 text-lg rounded-full border-2 border-blue-200 hover:border-blue-400 focus:border-blue-600 hover:shadow-lg focus:shadow-xl transition-all bg-white/90 backdrop-blur-sm"
                disabled={isSearching}
              />
              <Button
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full h-10 px-6 bg-blue-600 hover:bg-blue-700 transition-all shadow-md"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Buscar"
                )}
              </Button>

              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm border border-blue-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  {filteredDatasets.map((dataset) => (
                    <button
                      key={dataset.id}
                      type="button"
                      onClick={() => handleSuggestionClick(dataset)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 border-b border-blue-100 last:border-b-0 transition-colors"
                    >
                      <Table2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-blue-900 truncate">{dataset.table_name}</p>
                        <p className="text-xs text-blue-600">{dataset.record_count.toLocaleString()} registros</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>

          {/* Dataset Cards - Maritime Theme */}
          {(
            <div className="mt-12 px-8 max-w-7xl w-full">
              <p className="text-blue-700 mb-6 text-lg font-medium text-center">
                Datasets portuários disponíveis
              </p>

              {isLoadingDatasets ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
                  <span className="text-blue-600">Carregando datasets...</span>
                </div>
              ) : datasets.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="h-12 w-12 mx-auto mb-4 text-blue-300" />
                  <p className="text-blue-600">Nenhum dataset público disponível</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {(showAllDatasets ? datasets : datasets.slice(0, 6)).map((dataset, index) => {
                      const columnCount = Object.keys(dataset.column_structure || {}).length
                      return (
                        <div
                          key={dataset.id}
                          style={{
                            animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`
                          }}
                        >
                          <Card
                            className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-l-4 border-l-blue-500 cursor-pointer bg-white/80 backdrop-blur-sm hover:bg-white"
                            onClick={() => handleCardClick(dataset)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded bg-blue-100 flex-shrink-0">
                                  <Table2 className="h-3 w-3 text-blue-600" />
                                </div>
                                <h3 className="text-sm font-semibold truncate text-blue-900">{dataset.table_name}</h3>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )
                    })}
                  </div>
                  {datasets.length > 6 && (
                    <div className="flex justify-center mt-6">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllDatasets(!showAllDatasets)}
                        className="border-blue-300 hover:bg-blue-50 hover:border-blue-500 text-blue-700"
                      >
                        {showAllDatasets ? "Ver menos" : `Ver mais (${datasets.length - 6})`}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Dataset Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open)
        if (!open) {
          setSearchResults([])
          setSearchQuery("")
          setFilteredDatasets([])
        }
      }}>
        <DialogContent className="!max-w-[98vw] !w-[98vw] !h-[95vh] flex flex-col p-6">
          {selectedDataset && (
            <>
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="flex items-center gap-2 text-black">
                  <Database className="h-5 w-5" />
                  {selectedDataset.table_name}
                </DialogTitle>
              </DialogHeader>

              <div className="flex-shrink-0 flex items-center justify-between py-3 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Registros:</span>
                    <span className="font-bold text-black">{selectedDataset.record_count.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Columns3 className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Colunas:</span>
                    <span className="font-bold text-black">{Object.keys(selectedDataset.column_structure || {}).length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Criado em:</span>
                    <span className="font-bold text-black">{new Date(selectedDataset.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={downloadFormat} onValueChange={setDownloadFormat}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xlsx">XLSX</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => handleDownload(selectedDataset.id, selectedDataset.table_name)}
                    variant="outline"
                    size="sm"
                    className="border-gray-300 hover:bg-gray-100 hover:border-black"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto mt-4">
                {isSearching ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-black mr-3" />
                    <span className="text-lg text-gray-700 font-medium">Carregando dados...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-[50px] font-bold text-black sticky top-0 bg-gray-50">
                            <Checkbox
                              checked={selectedColumns.length === Object.keys(selectedDataset.column_structure || {}).length}
                              onCheckedChange={() => toggleAllColumns(Object.keys(selectedDataset.column_structure || {}))}
                            />
                          </TableHead>
                          {Object.keys(selectedDataset.column_structure || {}).map((col) => (
                            <TableHead key={col} className="font-mono font-bold text-black sticky top-0 bg-gray-50">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={selectedColumns.includes(col)}
                                  onCheckedChange={() => toggleColumn(col)}
                                />
                                {col}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={Object.keys(selectedDataset.column_structure || {}).length + 1} className="text-center py-8 text-gray-500">
                            Carregando dados...
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {Object.keys(activeFilters).length > 0 && (
                      <div className="mb-2 text-sm text-gray-600">
                        Mostrando {filteredData.length} de {searchResults[0]?.data.length} registros
                      </div>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-[50px] font-bold text-black sticky top-0 bg-gray-50">
                            <Checkbox
                              checked={selectedColumns.length === searchResults[0]?.columns.length}
                              onCheckedChange={() => toggleAllColumns(searchResults[0]?.columns || [])}
                            />
                          </TableHead>
                          {searchResults[0]?.columns.map((col) => {
                            const colMeta = getColumnMetadata(col)
                            return (
                              <TableHead key={col} className="font-mono font-bold text-black sticky top-0 bg-gray-50">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={selectedColumns.includes(col)}
                                    onCheckedChange={() => toggleColumn(col)}
                                  />
                                  {col}
                                  {colMeta && (
                                    <ColumnFilterPopover
                                      column={col}
                                      columnType={colMeta.filter_type}
                                      uniqueValues={colMeta.unique_values}
                                      value={activeFilters[col]}
                                      onChange={(filter) => handleFilterChange(col, filter)}
                                      isActive={!!activeFilters[col]}
                                    />
                                  )}
                                </div>
                              </TableHead>
                            )
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.map((row, rowIndex) => (
                          <TableRow key={rowIndex} className="hover:bg-gray-50 transition-colors">
                            <TableCell className="w-[50px]"></TableCell>
                            {searchResults[0]?.columns.map((col) => (
                              <TableCell key={col} className="font-mono text-sm">
                                {row[col] !== null && row[col] !== undefined ? String(row[col]) : "-"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>


      {/* CSS Animations */}
      <style jsx>{`
        @keyframes wave-animation {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .wave-back {
          animation: wave-move-back 8s ease-in-out infinite;
        }

        .wave-middle {
          animation: wave-move-middle 6s ease-in-out infinite;
        }

        .wave-front {
          animation: wave-move-front 4s ease-in-out infinite;
        }

        @keyframes wave-move-back {
          0%, 100% {
            d: path("M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z");
          }
          50% {
            d: path("M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,149.3C672,149,768,203,864,218.7C960,235,1056,213,1152,197.3C1248,181,1344,171,1392,165.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z");
          }
        }

        @keyframes wave-move-middle {
          0%, 100% {
            d: path("M0,256L48,240C96,224,192,192,288,181.3C384,171,480,181,576,197.3C672,213,768,235,864,224C960,213,1056,171,1152,165.3C1248,160,1344,192,1392,208L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z");
          }
          50% {
            d: path("M0,224L48,213.3C96,203,192,181,288,192C384,203,480,245,576,250.7C672,256,768,224,864,208C960,192,1056,192,1152,202.7C1248,213,1344,235,1392,245.3L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z");
          }
        }

        @keyframes wave-move-front {
          0%, 100% {
            d: path("M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,229.3C672,245,768,267,864,261.3C960,256,1056,224,1152,213.3C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z");
          }
          50% {
            d: path("M0,256L48,266.7C96,277,192,299,288,282.7C384,267,480,213,576,197.3C672,181,768,203,864,218.7C960,235,1056,245,1152,250.7C1248,256,1344,256,1392,256L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z");
          }
        }

        .bubbles {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .bubble {
          position: absolute;
          bottom: -20px;
          width: 8px;
          height: 8px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          animation: bubble-rise linear infinite;
        }

        @keyframes bubble-rise {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.6;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-250px) scale(0.5);
            opacity: 0;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
