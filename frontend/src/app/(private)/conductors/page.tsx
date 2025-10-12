"use client"

import { useState, useEffect, useCallback } from "react"
import { useDataOperators, DataOperatorFormData, DataOperator } from "@/hooks/useDataOperators"
import { toast } from "sonner"
import {
  ConductorDataTable,
  ConductorStats,
  ConductorDialog,
  DeactivateConductorDialog,
} from "@/components/conductors"

export default function ConductorsPage() {
  // State for dialogs and editing
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingConductor, setEditingConductor] = useState<DataOperator | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false)
  const [conductorToDeactivate, setConductorToDeactivate] = useState<DataOperator | null>(null)

  // State for server-side pagination and filtering
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [filters, setFilters] = useState<Record<string, any>>({});

  const {
    conductors: dataOperators,
    totalCount,
    isLoading,
    fetchConductors: fetchDataOperators,
    createConductor: createDataOperator,
    updateConductor: updateDataOperator,
  } = useDataOperators()

  // Fetch data when pagination or filters change
  useEffect(() => {
    const fetchParams = {
      page: pagination.pageIndex + 1, // API is 1-based, table is 0-based
      pageSize: pagination.pageSize,
      filters: filters,
    };
    fetchDataOperators(fetchParams);
  }, [pagination, filters, fetchDataOperators]);

  const handleRefreshData = useCallback(() => {
    const fetchParams = {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      filters: filters,
    };
    fetchDataOperators(fetchParams);
  }, [pagination, filters, fetchDataOperators]);

  const handleSubmit = async (data: DataOperatorFormData) => {
    setIsSubmitting(true)
    try {
      if (editingConductor) {
        await updateDataOperator(editingConductor.id, data)
        toast.success("Condutor atualizado com sucesso!")
      } else {
        await createDataOperator(data)
        toast.success("Condutor cadastrado com sucesso!")
      }
      setIsDialogOpen(false)
      setEditingConductor(null)
      handleRefreshData() // Refresh data
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar condutor")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (conductor: DataOperator) => {
    setEditingConductor(conductor)
    setIsDialogOpen(true)
  }

  const handleDelete = (conductor: DataOperator) => {
    setConductorToDeactivate(conductor)
    setIsDeactivateDialogOpen(true)
  }

  const handleConfirmDeactivate = async () => {
    if (!conductorToDeactivate) return

    setIsSubmitting(true)
    try {
      await updateDataOperator(conductorToDeactivate.id, { is_active: false })
      toast.success("Condutor inativado com sucesso!")
      setIsDeactivateDialogOpen(false)
      setConductorToDeactivate(null)
      handleRefreshData() // Refresh data
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao inativar condutor")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNewConductor = () => {
    setEditingConductor(null)
    setIsDialogOpen(true)
  }

  const handleViewDetails = (conductor: DataOperator) => {
    if (!conductor || !conductor.id) {
      toast.error('Erro: ID do condutor não encontrado');
      return;
    }
    const url = `/conductors/${conductor.id}/details`;
    window.open(url, '_blank');
  }

  return (
    <div className="flex flex-col h-full p-4 pt-0">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Condutores</h1>
            <p className="text-gray-500 mt-1">Gerenciar condutores do sistema</p>
          </div>
        </div>

        <ConductorStats conductors={dataOperators} />

        <div className="flex-1 min-h-0">
          <ConductorDataTable
            conductors={dataOperators}
            totalCount={totalCount}
            pagination={pagination}
            onPaginationChange={setPagination}
            filters={filters}
            onFilterChange={setFilters}
            onAdd={handleNewConductor}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewDetails={handleViewDetails}
            isLoading={isLoading}
          />
        </div>

        <ConductorDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          conductor={editingConductor}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
        />

        <DeactivateConductorDialog
          open={isDeactivateDialogOpen}
          onOpenChange={setIsDeactivateDialogOpen}
          conductor={conductorToDeactivate}
          onConfirm={handleConfirmDeactivate}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  )
}
