"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Clock, Table2 } from "lucide-react"
import Link from "next/link"

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

interface ProcessCardProps {
  process: DataImportProcess
}

const statusConfig = {
  active: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    badge: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    borderColor: "border-green-200 dark:border-green-900/30"
  },
  inactive: {
    icon: XCircle,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-900/20",
    badge: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    borderColor: "border-gray-200 dark:border-gray-900/30"
  }
}

export function ProcessCard({ process }: ProcessCardProps) {
  const config = statusConfig[process.status as keyof typeof statusConfig] || statusConfig.active
  const StatusIcon = config.icon
  const columnCount = Object.keys(process.column_structure || {}).length

  return (
    <Link href={`/gestao/${process.id}`} target="_blank" rel="noopener noreferrer" className="block">
      <Card className={`hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-l-4 ${config.borderColor} cursor-pointer`}>
        <CardContent className="p-3">
          <div className="space-y-2">
            {/* Header - Nome */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`p-1.5 rounded-lg ${config.bgColor} flex-shrink-0`}>
                  <Table2 className={`h-3.5 w-3.5 ${config.color}`} />
                </div>
                <h3 className="text-sm font-semibold truncate">{process.table_name}</h3>
              </div>
              <Badge className={`${config.badge} flex-shrink-0 text-xs`} variant="secondary">
                <StatusIcon className="h-3 w-3 mr-1" />
                {process.status_display}
              </Badge>
            </div>

            {/* Stats - Records e Columns */}
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                <p className="text-[10px] text-muted-foreground mb-0.5">Records</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {process.record_count.toLocaleString()}
                </p>
              </div>
              <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-900/20">
                <p className="text-[10px] text-muted-foreground mb-0.5">Columns</p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {columnCount}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
