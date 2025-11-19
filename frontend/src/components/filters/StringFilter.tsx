"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface StringFilterProps {
  value: {
    operator: string
    value: string
  }
  onChange: (value: { operator: string; value: string }) => void
}

export function StringFilter({ value, onChange }: StringFilterProps) {
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
            <SelectItem value="contains">Contém</SelectItem>
            <SelectItem value="equals">Igual a</SelectItem>
            <SelectItem value="starts_with">Começa com</SelectItem>
            <SelectItem value="ends_with">Termina com</SelectItem>
            <SelectItem value="not_contains">Não contém</SelectItem>
            <SelectItem value="is_empty">Está vazio</SelectItem>
            <SelectItem value="is_not_empty">Não está vazio</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {!["is_empty", "is_not_empty"].includes(value.operator) && (
        <div className="space-y-1">
          <Label className="text-xs">Valor</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Digite o valor..."
            value={value.value}
            onChange={(e) => onChange({ ...value, value: e.target.value })}
          />
        </div>
      )}
    </div>
  )
}
