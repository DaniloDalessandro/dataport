"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ManagementCenter, RequestingCenter } from "@/lib/api/centers"

interface ManagementCenterActionsProps {
  center: ManagementCenter
  onEdit: (center: ManagementCenter) => void
  onDelete: (center: ManagementCenter) => void
}

interface RequestingCenterActionsProps {
  center: RequestingCenter
  onEdit: (center: RequestingCenter) => void
  onDelete: (center: RequestingCenter) => void
}

const ManagementCenterActions = ({ center, onEdit, onDelete }: ManagementCenterActionsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(center)}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDelete(center)}
          className="text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const RequestingCenterActions = ({ center, onEdit, onDelete }: RequestingCenterActionsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(center)}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDelete(center)}
          className="text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const managementCenterColumns = (
  onEdit: (center: ManagementCenter) => void,
  onDelete: (center: ManagementCenter) => void
): ColumnDef<ManagementCenter>[] => [
  {
    accessorKey: "name",
    header: "Nome",
  },
  {
    accessorKey: "description",
    header: "Descrição",
    cell: ({ row }) => {
      const description = row.getValue("description") as string
      return description ? (
        <span className="text-sm text-muted-foreground">{description}</span>
      ) : (
        <span className="text-sm text-muted-foreground italic">Sem descrição</span>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: "Criado em",
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"))
      return date.toLocaleDateString("pt-BR")
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const center = row.original
      return <ManagementCenterActions center={center} onEdit={onEdit} onDelete={onDelete} />
    },
  },
]

export const requestingCenterColumns = (
  onEdit: (center: RequestingCenter) => void,
  onDelete: (center: RequestingCenter) => void,
  managementCenters: ManagementCenter[]
): ColumnDef<RequestingCenter>[] => [
  {
    accessorKey: "name",
    header: "Nome",
  },
  {
    accessorKey: "management_center",
    header: "Centro Gestor",
    cell: ({ row }) => {
      const managementCenterId = row.getValue("management_center") as number
      const managementCenter = managementCenters.find(mc => mc.id === managementCenterId)
      return managementCenter ? managementCenter.name : "Não encontrado"
    },
  },
  {
    accessorKey: "description",
    header: "Descrição",
    cell: ({ row }) => {
      const description = row.getValue("description") as string
      return description ? (
        <span className="text-sm text-muted-foreground">{description}</span>
      ) : (
        <span className="text-sm text-muted-foreground italic">Sem descrição</span>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: "Criado em",
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"))
      return date.toLocaleDateString("pt-BR")
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const center = row.original
      return <RequestingCenterActions center={center} onEdit={onEdit} onDelete={onDelete} />
    },
  },
]