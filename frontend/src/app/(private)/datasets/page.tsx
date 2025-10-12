"use client"

import { useState } from "react"
import { Search, Plus, Database, Calendar, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Mock data - substituir por dados reais da API
const mockDatasets = [
  {
    id: 1,
    name: "Dataset de Vendas 2024",
    description: "Dados consolidados de vendas do ano de 2024",
    records: 15420,
    lastUpdate: "2024-01-10",
    status: "active",
  },
  {
    id: 2,
    name: "Cadastro de Clientes",
    description: "Base completa de clientes ativos e inativos",
    records: 8934,
    lastUpdate: "2024-01-09",
    status: "active",
  },
  {
    id: 3,
    name: "Histórico de Transações",
    description: "Registro de todas as transações financeiras",
    records: 45123,
    lastUpdate: "2024-01-08",
    status: "active",
  },
  {
    id: 4,
    name: "Dados de Produtos",
    description: "Catálogo completo de produtos e serviços",
    records: 2341,
    lastUpdate: "2024-01-07",
    status: "archived",
  },
  {
    id: 5,
    name: "Métricas de Performance",
    description: "Indicadores de performance e KPIs",
    records: 892,
    lastUpdate: "2024-01-06",
    status: "active",
  },
  {
    id: 6,
    name: "Dados de Fornecedores",
    description: "Cadastro e informações de fornecedores",
    records: 456,
    lastUpdate: "2024-01-05",
    status: "active",
  },
]

export default function DatasetsPage() {
  const [searchTerm, setSearchTerm] = useState("")

  // Filtrar datasets pelo nome
  const filteredDatasets = mockDatasets.filter((dataset) =>
    dataset.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestão de Dados</h1>
            <p className="text-gray-500 mt-1">Gerenciar conjuntos de dados</p>
          </div>
        </div>

        {/* Search and Add Button */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Dataset
          </Button>
        </div>

        {/* Results Count */}
        {searchTerm && (
          <div className="text-sm text-gray-600">
            {filteredDatasets.length} resultado(s) encontrado(s) para "{searchTerm}"
          </div>
        )}

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDatasets.map((dataset) => (
            <Card
              key={dataset.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Database className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {dataset.name}
                      </CardTitle>
                      <Badge className={`mt-2 ${getStatusColor(dataset.status)}`}>
                        {getStatusLabel(dataset.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4 line-clamp-2">
                  {dataset.description}
                </CardDescription>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>{dataset.records.toLocaleString()} registros</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Atualizado em {new Date(dataset.lastUpdate).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredDatasets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Database className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum dataset encontrado
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm
                ? `Não encontramos datasets com o nome "${searchTerm}"`
                : "Comece adicionando um novo dataset"}
            </p>
            {!searchTerm && (
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Primeiro Dataset
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
