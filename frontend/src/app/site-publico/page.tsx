"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Download, Database, Loader2, Table2 } from "lucide-react"
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
                          onClick={() => {
                            setSearchQuery(dataset.table_name)
                            // Use setTimeout to ensure state is updated before search
                            setTimeout(() => {
                              setIsSearching(true)
                              setIsModalOpen(true)
                              const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                              fetch(`${API_BASE_URL}/api/data-import/public-search/?q=${encodeURIComponent(dataset.table_name)}`)
                                .then(response => {
                                  if (!response.ok) throw new Error('Erro ao buscar dados')
                                  return response.json()
                                })
                                .then(data => {
                                  if (data.success) {
                                    setSearchResults(data.results || [])
                                    if (data.results.length === 0) {
                                      toast.info("Nenhum resultado encontrado")
                                    }
                                  } else {
                                    toast.error(data.error || "Erro ao buscar dados")
                                    setSearchResults([])
                                  }
                                })
                                .catch((error: any) => {
                                  console.error("Search error:", error)
                                  toast.error(error.message || "Erro ao buscar dados")
                                  setSearchResults([])
                                })
                                .finally(() => {
                                  setIsSearching(false)
                                })
                            }, 0)
                          }}
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

      {/* Results Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-black">Resultados da busca: {searchQuery}</DialogTitle>
          </DialogHeader>

          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-black mr-3" />
              <span className="text-lg text-gray-700 font-medium">Buscando...</span>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold mb-2 text-black">Nenhum resultado encontrado</h3>
              <p className="text-gray-600">
                Tente buscar por outros termos
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-700 font-medium">
                Encontrados resultados em {searchResults.length} {searchResults.length === 1 ? 'base' : 'bases'} de dados
              </p>

              {searchResults.map((result, index) => (
                <Card key={index} className="overflow-hidden border-gray-200">
                  <CardContent className="p-0">
                    {/* Table header */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center">
                          <Database className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-black">{result.table_name}</h3>
                          <p className="text-xs text-gray-600">
                            {result.count} {result.count === 1 ? 'registro' : 'registros'}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDownload(result.process_id, result.table_name)}
                        variant="outline"
                        size="sm"
                        className="border-gray-300 hover:bg-gray-100 hover:border-black text-xs h-7"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        CSV
                      </Button>
                    </div>

                    {/* Table data */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="w-[40px] font-semibold text-black text-xs">#</TableHead>
                            {result.columns.map((col) => (
                              <TableHead key={col} className="font-mono font-semibold text-black text-xs">
                                {col}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.data.slice(0, 10).map((row, rowIndex) => (
                            <TableRow key={rowIndex} className="hover:bg-gray-50 transition-colors">
                              <TableCell className="font-medium text-gray-600 text-xs">
                                {rowIndex + 1}
                              </TableCell>
                              {result.columns.map((col) => (
                                <TableCell key={col} className="font-mono text-xs">
                                  {row[col] !== null && row[col] !== undefined ? String(row[col]) : "-"}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {result.count > 10 && (
                      <div className="p-2 bg-gray-50 text-center text-xs text-gray-600 border-t border-gray-200">
                        Mostrando 10 de {result.count} resultados. Baixe o CSV para ver todos.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
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
