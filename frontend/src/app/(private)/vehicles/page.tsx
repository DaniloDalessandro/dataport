"use client"

import { useState } from "react"
import {
  DatasetDataTable,
  DatasetStats,
  DatasetDialog,
  DatasetDetailDialog,
} from "@/components/datasets"
import { useDatasets, DatasetFormData, Dataset } from "@/hooks/useDatasets"
import { toast } from "sonner"

export default function DatasetsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)

  const {
    datasets,
    isLoading,
    createDataset,
    updateDataset,
    deleteDataset,
    fetchDatasets,
  } = useDatasets()

  const handleSubmit = async (data: DatasetFormData) => {
    setIsSubmitting(true)
    try {
      if (editingDataset) {
        await updateDataset(editingDataset.id, data)
        toast.success("Dataset atualizado com sucesso!")
      } else {
        await createDataset(data)
        toast.success("Dataset cadastrado com sucesso!")
      }
      setIsDialogOpen(false)
      setEditingDataset(null)
      // Refresh the datasets list to ensure data is up to date
      await fetchDatasets()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar dataset")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (dataset: Dataset) => {
    setEditingDataset(dataset)
    setIsDialogOpen(true)
  }

  const handleDelete = async (dataset: Dataset) => {
    try {
      await deleteDataset(dataset.id)
      toast.success("Dataset excluído com sucesso!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir dataset")
    }
  }

  const handleNewDataset = () => {
    setEditingDataset(null)
    setIsDialogOpen(true)
  }

  const handleViewDetails = (dataset: Dataset) => {
    // Open in new tab
    const url = `/datasets/${dataset.id}/details`;
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
        <DatasetStats datasets={datasets} />

        {/* Data Table with Fixed Height and Scroll */}
        <div className="flex-1 min-h-0">
          <DatasetDataTable
            datasets={datasets}
            onAdd={handleNewDataset}
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
          dataset={editingDataset}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
        />

        {/* Dialog for View Details */}
        <DatasetDetailDialog
          dataset={selectedDataset}
          open={isDetailDialogOpen && selectedDataset !== null}
          onOpenChange={(open) => {
            setIsDetailDialogOpen(open);
            if (!open) {
              // Clear selected dataset when dialog closes
              setSelectedDataset(null);
            }
          }}
          onEdit={handleEdit}
        />
      </div>
    </div>
  )
}