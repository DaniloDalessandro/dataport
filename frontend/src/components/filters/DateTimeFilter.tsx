"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateTimeFilterProps {
  value: {
    operator: string
    value: string
    value2?: string
  }
  onChange: (value: { operator: string; value: string; value2?: string }) => void
}

export function DateTimeFilter({ value, onChange }: DateTimeFilterProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Operador</Label>
        <Select
          value={value.operator}
          onValueChange={(op) => onChange({ ...value, operator: op })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="equals">Igual a</SelectItem>
            <SelectItem value="before">Antes de</SelectItem>
            <SelectItem value="after">Depois de</SelectItem>
            <SelectItem value="between">Entre</SelectItem>
            <SelectItem value="is_empty">Está vazio</SelectItem>
            <SelectItem value="is_not_empty">Não está vazio</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {!["is_empty", "is_not_empty"].includes(value.operator) && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">
              {value.operator === "between" ? "Data/hora inicial" : "Data/hora"}
            </Label>
            <Input
              className="h-8 text-xs"
              type="datetime-local"
              value={value.value}
              onChange={(e) => onChange({ ...value, value: e.target.value })}
            />
          </div>
          {value.operator === "between" && (
            <div className="space-y-1">
              <Label className="text-xs">Data/hora final</Label>
              <Input
                className="h-8 text-xs"
                type="datetime-local"
                value={value.value2 || ""}
                onChange={(e) => onChange({ ...value, value2: e.target.value })}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
