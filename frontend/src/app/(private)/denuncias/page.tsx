"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Search,
  Eye,
  Loader2,
  Filter,
  AlertTriangle,
  Save,
} from "lucide-react"

import {
  getComplaints,
  updateComplaintStatus,
  updateComplaintPriority,
  updateComplaint,
  type Complaint,
} from "@/services/complaints"

import { ComplaintStatusBadge } from "./ComplaintStatusBadge"
import { ComplaintPriorityBadge } from "./ComplaintPriorityBadge"
import {
  formatPlate,
  formatDateTime,
  formatDate,
  getRelativeTime,
  formatPhone,
} from "@/lib/formatters"

export default function DenunciasPage() {
  const router = useRouter()

  // State
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('todas')
  const [priorityFilter, setPriorityFilter] = useState<string>('todas')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Modal state
  const [detailsDialog, setDetailsDialog] = useState<{
    open: boolean;
    data: Complaint | null;
  }>({
    open: false,
    data: null,
  })

  // Edit state for modal
  const [editingStatus, setEditingStatus] = useState<string>('')
  const [editingPriority, setEditingPriority] = useState<string>('')
  const [adminNotes, setAdminNotes] = useState<string>('')
  const [resolutionNotes, setResolutionNotes] = useState<string>('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Load data
  const loadComplaints = useCallback(async () => {
    try {
      const filters: any = {}
      if (statusFilter !== 'todas') filters.status = statusFilter
      if (priorityFilter !== 'todas') filters.priority = priorityFilter
      if (debouncedSearch) filters.search = debouncedSearch

      const data = await getComplaints(filters)
      setComplaints(Array.isArray(data) ? data : [])
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar denúncias')
      setComplaints([])
    }
  }, [statusFilter, priorityFilter, debouncedSearch])

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.push("/")
      return
    }

    const loadData = async () => {
      setIsLoading(true)
      try {
        await loadComplaints()
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router, loadComplaints])

  // Open details modal
  const openDetailsModal = (complaint: Complaint) => {
    setDetailsDialog({ open: true, data: complaint })
    setEditingStatus(complaint.status)
    setEditingPriority(complaint.priority)
    setAdminNotes(complaint.admin_notes || '')
    setResolutionNotes(complaint.resolution_notes || '')
  }

  // Close details modal
  const closeDetailsModal = () => {
    setDetailsDialog({ open: false, data: null })
    setEditingStatus('')
    setEditingPriority('')
    setAdminNotes('')
    setResolutionNotes('')
  }

  // Handle status change
  const handleStatusChange = async () => {
    if (!detailsDialog.data) return

    if (editingStatus === detailsDialog.data.status) {
      toast.info('O status não foi alterado')
      return
    }

    setIsActionLoading(true)
    try {
      await updateComplaintStatus(detailsDialog.data.id, editingStatus)
      toast.success('Status atualizado com sucesso!')
      await loadComplaints()

      // Update modal data
      const updatedComplaint = { ...detailsDialog.data, status: editingStatus as any }
      setDetailsDialog({ ...detailsDialog, data: updatedComplaint })
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar status')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Handle priority change
  const handlePriorityChange = async () => {
    if (!detailsDialog.data) return

    if (editingPriority === detailsDialog.data.priority) {
      toast.info('A prioridade não foi alterada')
      return
    }

    setIsActionLoading(true)
    try {
      await updateComplaintPriority(detailsDialog.data.id, editingPriority)
      toast.success('Prioridade atualizada com sucesso!')
      await loadComplaints()

      // Update modal data
      const updatedComplaint = { ...detailsDialog.data, priority: editingPriority as any }
      setDetailsDialog({ ...detailsDialog, data: updatedComplaint })
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar prioridade')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Handle notes update
  const handleNotesUpdate = async () => {
    if (!detailsDialog.data) return

    const hasAdminNotesChanged = adminNotes !== (detailsDialog.data.admin_notes || '')
    const hasResolutionNotesChanged = resolutionNotes !== (detailsDialog.data.resolution_notes || '')

    if (!hasAdminNotesChanged && !hasResolutionNotesChanged) {
      toast.info('As notas não foram alteradas')
      return
    }

    setIsActionLoading(true)
    try {
      const updateData: any = {}
      if (hasAdminNotesChanged) updateData.admin_notes = adminNotes
      if (hasResolutionNotesChanged) updateData.resolution_notes = resolutionNotes

      await updateComplaint(detailsDialog.data.id, updateData)
      toast.success('Notas atualizadas com sucesso!')
      await loadComplaints()

      // Update modal data
      const updatedComplaint = {
        ...detailsDialog.data,
        admin_notes: adminNotes,
        resolution_notes: resolutionNotes,
      }
      setDetailsDialog({ ...detailsDialog, data: updatedComplaint })
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar notas')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Render table
  const renderTable = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (!Array.isArray(complaints) || complaints.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma denúncia encontrada</h3>
          <p className="text-sm text-muted-foreground">
            {statusFilter !== 'todas' || priorityFilter !== 'todas' || debouncedSearch
              ? 'Tente ajustar os filtros de busca'
              : 'Não há denúncias registradas no momento'}
          </p>
        </div>
      )
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.isArray(complaints) && complaints.map((complaint) => (
              <TableRow key={complaint.id}>
                <TableCell className="font-medium font-mono">
                  {formatPlate(complaint.vehicle_plate)}
                </TableCell>
                <TableCell>{complaint.complaint_type_display}</TableCell>
                <TableCell>
                  <ComplaintStatusBadge status={complaint.status} />
                </TableCell>
                <TableCell>
                  <ComplaintPriorityBadge priority={complaint.priority} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {getRelativeTime(complaint.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDetailsModal(complaint)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  // Render details modal
  const renderDetailsModal = () => {
    if (!detailsDialog.data) return null

    const data = detailsDialog.data

    return (
      <Dialog open={detailsDialog.open} onOpenChange={(open) => {
        if (!open) closeDetailsModal()
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Denúncia</DialogTitle>
            <DialogDescription>
              Informações completas e gerenciamento da denúncia
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status and Priority Management */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <div className="flex gap-2">
                  <Select value={editingStatus} onValueChange={setEditingStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_analise">Em Análise</SelectItem>
                      <SelectItem value="resolvida">Resolvida</SelectItem>
                      <SelectItem value="arquivada">Arquivada</SelectItem>
                    </SelectContent>
                  </Select>
                  {editingStatus !== data.status && (
                    <Button
                      size="sm"
                      onClick={handleStatusChange}
                      disabled={isActionLoading}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Prioridade</Label>
                <div className="flex gap-2">
                  <Select value={editingPriority} onValueChange={setEditingPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                  {editingPriority !== data.priority && (
                    <Button
                      size="sm"
                      onClick={handlePriorityChange}
                      disabled={isActionLoading}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-orange-600">Informações do Veículo</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Placa</Label>
                  <p className="text-sm mt-1 font-mono">{formatPlate(data.vehicle_plate)}</p>
                </div>
                {data.vehicle && (
                  <>
                    <div>
                      <Label className="text-sm font-medium">Marca/Modelo</Label>
                      <p className="text-sm mt-1">{data.vehicle.brand} {data.vehicle.model}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Complaint Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-orange-600">Informações da Denúncia</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Tipo de Denúncia</Label>
                  <p className="text-sm mt-1">{data.complaint_type_display}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Descrição</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded-md whitespace-pre-wrap">
                    {data.description}
                  </p>
                </div>

                {data.occurrence_date && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Data da Ocorrência</Label>
                      <p className="text-sm mt-1">{formatDate(data.occurrence_date)}</p>
                    </div>
                    {data.occurrence_location && (
                      <div>
                        <Label className="text-sm font-medium">Local da Ocorrência</Label>
                        <p className="text-sm mt-1">{data.occurrence_location}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Complainant Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-orange-600">Informações do Denunciante</h3>
              {data.is_anonymous ? (
                <p className="text-sm p-3 bg-muted rounded-md text-muted-foreground">
                  Denúncia anônima
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {data.complainant_name && (
                    <div>
                      <Label className="text-sm font-medium">Nome</Label>
                      <p className="text-sm mt-1">{data.complainant_name}</p>
                    </div>
                  )}
                  {data.complainant_email && (
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm mt-1">{data.complainant_email}</p>
                    </div>
                  )}
                  {data.complainant_phone && (
                    <div>
                      <Label className="text-sm font-medium">Telefone</Label>
                      <p className="text-sm mt-1">{formatPhone(data.complainant_phone)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Admin Notes */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-orange-600">Notas Internas</h3>
              <div className="space-y-2">
                <Textarea
                  placeholder="Adicione notas internas sobre esta denúncia..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                />
                {adminNotes !== (data.admin_notes || '') && (
                  <Button
                    size="sm"
                    onClick={handleNotesUpdate}
                    disabled={isActionLoading}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Notas Internas
                  </Button>
                )}
              </div>
            </div>

            {/* Resolution Notes */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-orange-600">Notas de Resolução</h3>
              <div className="space-y-2">
                <Textarea
                  placeholder="Adicione notas sobre a resolução desta denúncia..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                />
                {resolutionNotes !== (data.resolution_notes || '') && (
                  <Button
                    size="sm"
                    onClick={handleNotesUpdate}
                    disabled={isActionLoading}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Notas de Resolução
                  </Button>
                )}
              </div>
            </div>

            {/* Review Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-orange-600">Histórico</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Data de Criação</Label>
                  <p className="text-sm mt-1">{formatDateTime(data.created_at)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Última Atualização</Label>
                  <p className="text-sm mt-1">{formatDateTime(data.updated_at)}</p>
                </div>
                {data.reviewed_by && (
                  <>
                    <div>
                      <Label className="text-sm font-medium">Analisado por</Label>
                      <p className="text-sm mt-1">
                        {data.reviewed_by.username} ({data.reviewed_by.email})
                      </p>
                    </div>
                    {data.reviewed_at && (
                      <div>
                        <Label className="text-sm font-medium">Data da Análise</Label>
                        <p className="text-sm mt-1">{formatDateTime(data.reviewed_at)}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDetailsModal}
              disabled={isActionLoading}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 pt-2">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Gestão de Denúncias</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie e acompanhe denúncias relacionadas a veículos
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por placa, tipo ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="resolvida">Resolvida</SelectItem>
                  <SelectItem value="arquivada">Arquivada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <SelectValue placeholder="Prioridade" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Prioridades</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Denúncias Registradas
          </CardTitle>
          <CardDescription>
            Lista de todas as denúncias recebidas ({complaints.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderTable()}
        </CardContent>
      </Card>

      {/* Details Modal */}
      {renderDetailsModal()}
    </div>
  )
}
