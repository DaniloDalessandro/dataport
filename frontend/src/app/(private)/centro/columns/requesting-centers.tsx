import { ColumnDef } from "@tanstack/react-table";
import { RequestingCenter } from "@/lib/api/centers";

export const columns = (): ColumnDef<RequestingCenter>[] => [
  {
    accessorKey: "name",
    header: "Nome",
    enableSorting: true,
    meta: {
      showFilterIcon: true,
    },
  },
  {
    accessorKey: "management_center",
    header: "Centro Gestor",
    enableSorting: true,
    cell: ({ row }) => row.original.management_center?.name || "-",
  },
  {
    accessorKey: "created_at",
    header: "Criado em",
    enableSorting: true,
    cell: ({ row }) =>
      new Date(row.original.created_at).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).replace(",", ""),
  },
  {
    accessorKey: "updated_at",
    header: "Atualizado em",
    cell: ({ row }) =>
      new Date(row.original.updated_at).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).replace(",", ""),
  },
  {
    accessorKey: "created_by",
    header: "Criado por",
    cell: ({ row }) => row.original.created_by?.email ?? "-",
  },
  {
    accessorKey: "updated_by",
    header: "Atualizado por",
    cell: ({ row }) => row.original.updated_by?.email ?? "-",
  },
];