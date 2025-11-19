"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search } from "lucide-react"

interface CategoryFilterProps {
  value: string[]
  options: string[]
  onChange: (value: string[]) => void
}

export function CategoryFilter({ value, options, onChange }: CategoryFilterProps) {
  const [search, setSearch] = useState("")

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  )

  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option))
    } else {
      onChange([...value, option])
    }
  }

  const selectAll = () => {
    onChange(filteredOptions)
  }

  const clearAll = () => {
    onChange([])
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
        <Input
          className="h-8 pl-7 text-xs"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={selectAll}
          className="text-blue-600 hover:underline"
        >
          Selecionar todos
        </button>
        <span className="text-gray-300">|</span>
        <button
          type="button"
          onClick={clearAll}
          className="text-blue-600 hover:underline"
        >
          Limpar
        </button>
      </div>
      <ScrollArea className="h-[150px]">
        <div className="space-y-2">
          {filteredOptions.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-2">
              Nenhuma opção encontrada
            </p>
          ) : (
            filteredOptions.map((option) => (
              <div key={option} className="flex items-center gap-2">
                <Checkbox
                  id={`cat-${option}`}
                  checked={value.includes(option)}
                  onCheckedChange={() => toggleOption(option)}
                />
                <Label
                  htmlFor={`cat-${option}`}
                  className="text-xs cursor-pointer truncate"
                >
                  {option || "(vazio)"}
                </Label>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      {value.length > 0 && (
        <p className="text-xs text-gray-500">
          {value.length} selecionado{value.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  )
}
