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

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

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
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      const response = await fetch(`${API_BASE_URL}/api/data-import/public-download/${processId}/`)

      if (!response.ok) {
        throw new Error('Erro ao baixar dados')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${tableName}.csv`
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

  const handleCardClick = async (dataset: PublicDataset) => {
    setSelectedDataset(dataset)
    setSearchResults([])
    setIsModalOpen(true)
    setIsSearching(true)

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_BASE_URL}/api/data-import/public-data/${dataset.id}/`)

      if (!response.ok) {
        throw new Error('Erro ao buscar dados')
      }

      const data = await response.json()

      if (data.success) {
        // Set the result as an array with one item to match the existing structure
        setSearchResults([{
          process_id: data.process_id,
          table_name: data.table_name,
          columns: data.columns,
          data: data.data,
          count: data.count
        }])
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

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#fafafa]">
      {/* Typographic Wave Animation - Minimalist Black on White */}
      <div className="absolute bottom-0 left-0 right-0 h-72 overflow-hidden pointer-events-none">
        <div className="typo-wave-container">
          {/* Single large wave formed by characters */}
          <div className="typo-wave-main">
            {"LOA 1234 DWT 5678 BOCA 9012 PLR 3456 HORAS 7890 LOA 2468 DWT 1357 BOCA 8024 PLR 6813 HORAS 4590 LOA 1234 DWT 5678 BOCA 9012 PLR 3456 HORAS 7890 LOA 2468 DWT 1357 BOCA 8024 PLR 6813 HORAS 4590 LOA 1234 DWT 5678 BOCA 9012 PLR 3456 HORAS 7890 LOA 2468 DWT 1357 BOCA 8024 PLR 6813 HORAS 4590 ".split('').map((char, i) => {
              // Create pointed wave pattern (triangular)
              const period = 50
              const pos = i % period
              const normalized = pos / period
              // Triangular/pointed wave
              const triangleWave = normalized < 0.5
                ? normalized * 2
                : 2 - (normalized * 2)
              const yOffset = triangleWave * 100

              return (
                <span
                  key={i}
                  className="typo-char"
                  style={{
                    '--base-y': `${-yOffset}px`,
                    animationDelay: `${(i % 50) * 0.08}s`,
                  } as React.CSSProperties}
                >
                  {char}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header - Minimalist */}
        <div className="flex flex-col items-center pt-20 pb-12">
          {/* Logo/Title - Monochrome */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4 mb-3">
              <h1 className="text-6xl font-bold text-black tracking-tight">
                DataPort
              </h1>
            </div>
            <p className="text-center text-gray-600 font-medium mt-2">
              Portal Público de Dados Abertos
            </p>
          </div>

          {/* Search bar - Minimalist */}
          <form onSubmit={handleSearch} className="w-full max-w-2xl px-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar dados públicos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-12 pr-4 text-lg rounded-full border-2 border-gray-200 hover:border-gray-400 focus:border-black hover:shadow-lg focus:shadow-xl transition-all bg-white"
                disabled={isSearching}
              />
              <Button
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full h-10 px-6 bg-black hover:bg-gray-800 transition-all"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Buscar"
                )}
              </Button>
            </div>
          </form>

          {/* Dataset Cards - Public */}
          {(
            <div className="mt-12 px-8 max-w-7xl w-full">
              <p className="text-gray-600 mb-6 text-lg font-medium text-center">
                Datasets públicos disponíveis
              </p>

              {isLoadingDatasets ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-black mr-3" />
                  <span className="text-gray-600">Carregando datasets...</span>
                </div>
              ) : datasets.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600">Nenhum dataset público disponível</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {datasets.slice(0, 6).map((dataset, index) => {
                    const columnCount = Object.keys(dataset.column_structure || {}).length
                    return (
                      <div
                        key={dataset.id}
                        style={{
                          animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`
                        }}
                      >
                        <Card
                          className="hover:shadow-md hover:scale-[1.02] transition-all duration-200 border-l-2 border-l-black cursor-pointer bg-white"
                          onClick={() => handleCardClick(dataset)}
                        >
                          <CardContent className="p-2">
                            <div className="flex items-center gap-1.5">
                              <div className="p-1 rounded bg-gray-100 flex-shrink-0">
                                <Table2 className="h-2.5 w-2.5 text-black" />
                              </div>
                              <h3 className="text-xs font-semibold truncate text-black">{dataset.table_name}</h3>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </div>
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
                <Button
                  onClick={() => handleDownload(selectedDataset.id, selectedDataset.table_name)}
                  variant="outline"
                  size="sm"
                  className="border-gray-300 hover:bg-gray-100 hover:border-black"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
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
                          <TableHead className="w-[50px] font-bold text-black sticky top-0 bg-gray-50">#</TableHead>
                          {Object.keys(selectedDataset.column_structure || {}).map((col) => (
                            <TableHead key={col} className="font-mono font-bold text-black sticky top-0 bg-gray-50">
                              {col}
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
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-[50px] font-bold text-black sticky top-0 bg-gray-50">#</TableHead>
                          {searchResults[0]?.columns.map((col) => (
                            <TableHead key={col} className="font-mono font-bold text-black sticky top-0 bg-gray-50">
                              {col}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchResults[0]?.data.map((row, rowIndex) => (
                          <TableRow key={rowIndex} className="hover:bg-gray-50 transition-colors">
                            <TableCell className="font-medium text-gray-600">
                              {rowIndex + 1}
                            </TableCell>
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
        @keyframes typo-wave-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.33%);
          }
        }

        @keyframes wave-sway {
          0%, 100% {
            transform: translateY(var(--base-y)) scale(1);
          }
          50% {
            transform: translateY(calc(var(--base-y) - 8px)) scale(1.02);
          }
        }

        .typo-wave-container {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 100%;
        }

        .typo-wave-main {
          position: absolute;
          bottom: 20px;
          white-space: nowrap;
          font-family: 'Courier New', Consolas, monospace;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.03em;
          color: #000;
          animation: typo-wave-scroll 12s linear infinite;
        }

        .typo-char {
          display: inline-block;
          line-height: 1;
          animation: wave-sway 4s ease-in-out infinite;
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
