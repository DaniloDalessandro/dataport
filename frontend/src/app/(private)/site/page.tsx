"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Download, Database, Loader2, FileDown } from "lucide-react"
import { apiGet } from "@/lib/api"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface SearchResult {
  process_id: number
  table_name: string
  columns: string[]
  data: any[]
  count: number
}

export default function SitePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim()) {
      toast.error("Digite um termo para buscar")
      return
    }

    setIsSearching(true)
    setHasSearched(true)

    try {
      const data = await apiGet(`/api/data-import/search/?q=${encodeURIComponent(searchQuery)}`)

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
      const token = localStorage.getItem('access_token')

      const response = await fetch(`${API_BASE_URL}/api/data-import/processes/${processId}/download/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao baixar dados')
      }

      // Create blob and download
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
    <div className="min-h-screen bg-background">
      {/* Google-style search header */}
      <div className={`flex flex-col items-center transition-all duration-300 ${hasSearched ? 'pt-8 pb-6' : 'pt-32 pb-12'}`}>
        {/* Logo/Title */}
        <div className={`mb-8 transition-all duration-300 ${hasSearched ? 'scale-75' : 'scale-100'}`}>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            DataPort
          </h1>
          <p className="text-center text-muted-foreground mt-2">Busque dados em todas as bases cadastradas</p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl px-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar em todas as bases de dados..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-4 text-lg rounded-full border-2 hover:shadow-lg focus:shadow-xl transition-shadow"
              disabled={isSearching}
            />
            <Button
              type="submit"
              disabled={isSearching}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full h-10 px-6"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Buscar"
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="max-w-6xl mx-auto px-4 pb-8">
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
              <span className="text-lg text-muted-foreground">Buscando...</span>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Nenhum resultado encontrado</h3>
              <p className="text-muted-foreground">
                Tente buscar por outros termos
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Encontrados resultados em {searchResults.length} {searchResults.length === 1 ? 'tabela' : 'tabelas'}
                </p>
              </div>

              {searchResults.map((result, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Table header */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 border-b">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                          <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{result.table_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {result.count} {result.count === 1 ? 'resultado' : 'resultados'}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDownload(result.process_id, result.table_name)}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar CSV
                      </Button>
                    </div>

                    {/* Table data */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            {result.columns.map((col) => (
                              <TableHead key={col} className="font-mono">
                                {col}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.data.slice(0, 10).map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              <TableCell className="font-medium text-muted-foreground">
                                {rowIndex + 1}
                              </TableCell>
                              {result.columns.map((col) => (
                                <TableCell key={col} className="font-mono text-sm">
                                  {row[col] !== null && row[col] !== undefined ? String(row[col]) : "-"}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {result.count > 10 && (
                      <div className="p-3 bg-muted/30 text-center text-sm text-muted-foreground border-t">
                        Mostrando 10 de {result.count} resultados. Baixe o CSV para ver todos.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
