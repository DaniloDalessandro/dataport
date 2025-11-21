"use client"

import { useState, useEffect } from "react"
import { ImportForm } from "./components/ImportForm"
import { ProcessCard } from "./components/ProcessCard"
import { Loader2, Database, Plus, Search } from "lucide-react"
import { apiGet } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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
  created_by_name: string | null
}

interface PaginatedResponse {
  count: number
  next: string | null
  previous: string | null
  results: DataImportProcess[]
}

export default function GestaoPage() {
  const [processes, setProcesses] = useState<DataImportProcess[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const fetchProcesses = async () => {
    try {
      const data: PaginatedResponse = await apiGet("/api/data-import/processes/")
      setProcesses(data.results)
      setError(null)
    } catch (err: any) {
      console.error("Error loading processes:", err)
      setError(err.message || "Error loading data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProcesses()

    const interval = setInterval(fetchProcesses, 10000)

    return () => clearInterval(interval)
  }, [])

  const handleImportSuccess = async (newProcess?: DataImportProcess) => {
    setIsDialogOpen(false)

    // If we received the new process, add it immediately to the list
    if (newProcess) {
      setProcesses(prevProcesses => [newProcess, ...prevProcesses])
    }

    // Then fetch the full list to ensure we're in sync
    await new Promise(resolve => setTimeout(resolve, 500))
    await fetchProcesses()
  }

  // Filter processes
  const filteredProcesses = processes
    .filter((process) => {
      const matchesSearch = process.table_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      const matchesStatus =
        statusFilter === "all" || process.status === statusFilter
      return matchesSearch && matchesStatus
    })

  return (
    <div className="w-full py-4 px-6 space-y-4">
      {/* Search and Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by table name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Import Data</DialogTitle>
              <DialogDescription>
                Connect to an external API endpoint to import data into a new table
              </DialogDescription>
            </DialogHeader>
            <ImportForm onImportSuccess={handleImportSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Process Cards Grid */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-sm text-muted-foreground">Loading imports...</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="py-16 text-center">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <Database className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-destructive font-medium">{error}</p>
              <p className="text-sm text-muted-foreground">Please check your connection and try again</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredProcesses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="space-y-4">
              <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto">
                <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {processes.length === 0 ? "Nenhuma importação ainda" : "Nenhum resultado encontrado"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {processes.length === 0
                    ? "Clique em 'Adicionar' para começar"
                    : "Tente ajustar sua busca ou filtros"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProcesses.map((process, index) => (
            <div
              key={process.id}
              style={{
                animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`
              }}
            >
              <ProcessCard process={process} />
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
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
