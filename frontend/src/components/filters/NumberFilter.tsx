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

interface NumberFilterProps {
  value: {
    operator: string
    value: string
    value2?: string
  }
  onChange: (value: { operator: string; value: string; value2?: string }) => void
}

export function NumberFilter({ value, onChange }: NumberFilterProps) {
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
            <SelectItem value="not_equals">Diferente de</SelectItem>
            <SelectItem value="greater_than">Maior que</SelectItem>
            <SelectItem value="less_than">Menor que</SelectItem>
            <SelectItem value="greater_or_equal">Maior ou igual</SelectItem>
            <SelectItem value="less_or_equal">Menor ou igual</SelectItem>
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
              {value.operator === "between" ? "Valor mínimo" : "Valor"}
            </Label>
            <Input
              className="h-8 text-xs"
              type="number"
              placeholder="0"
              value={value.value}
              onChange={(e) => onChange({ ...value, value: e.target.value })}
            />
          </div>
          {value.operator === "between" && (
            <div className="space-y-1">
              <Label className="text-xs">Valor máximo</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                placeholder="100"
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
