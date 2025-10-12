"use client"

import { useState } from "react"
import {
  DatasetDataTable,
  DatasetStats,
  DatasetDialog,
  DatasetDetailDialog,
} from "@/components/datasets"
import { useVehicles, VehicleFormData, Vehicle } from "@/hooks/useVehicles"
import { toast } from "sonner"

export default function VehiclesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)

  const {
    vehicles,
    isLoading,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    fetchVehicles,
  } = useVehicles()

  const handleSubmit = async (data: VehicleFormData) => {
    setIsSubmitting(true)
    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, data)
        toast.success("Veículo atualizado com sucesso!")
      } else {
        await createVehicle(data)
        toast.success("Veículo cadastrado com sucesso!")
      }
      setIsDialogOpen(false)
      setEditingVehicle(null)
      // Refresh the vehicles list to ensure data is up to date
      await fetchVehicles()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar veículo")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setIsDialogOpen(true)
  }

  const handleDelete = async (vehicle: Vehicle) => {
    try {
      await deleteVehicle(vehicle.id)
      toast.success("Veículo excluído com sucesso!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir veículo")
    }
  }

  const handleNewVehicle = () => {
    setEditingVehicle(null)
    setIsDialogOpen(true)
  }

  const handleViewDetails = (vehicle: Vehicle) => {
    // Open in new tab
    const url = `/vehicles/${vehicle.id}/details`;
    window.open(url, '_blank');
  }

  return (
    <div className="flex flex-col h-full p-4 pt-0">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Datasets</h1>
            <p className="text-gray-500 mt-1">Gerenciar conjuntos de dados</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <DatasetStats datasets={vehicles} />

        {/* Data Table with Fixed Height and Scroll */}
        <div className="flex-1 min-h-0">
          <DatasetDataTable
            datasets={vehicles}
            onAdd={handleNewVehicle}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewDetails={handleViewDetails}
            isLoading={isLoading}
          />
        </div>

        {/* Dialog for Create/Edit */}
        <DatasetDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          dataset={editingVehicle}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
        />

        {/* Dialog for View Details */}
        <DatasetDetailDialog
          dataset={selectedVehicle}
          open={isDetailDialogOpen && selectedVehicle !== null}
          onOpenChange={(open) => {
            setIsDetailDialogOpen(open);
            if (!open) {
              // Clear selected dataset when dialog closes
              setSelectedVehicle(null);
            }
          }}
          onEdit={handleEdit}
        />
      </div>
    </div>
  )
}