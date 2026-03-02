"use client"

import * as React from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchableSelectProps {
  value: string
  onChange: (value: string, label: string) => void
  options: { label: string; value: string }[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const wrapperRef = React.useRef<HTMLDivElement>(null)

  // Handle outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Filter options
  const filteredOptions = React.useMemo(() => {
    if (!search) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase())
    )
  }, [options, search])

  // Get selected label
  const selectedLabel = React.useMemo(() => {
    return options.find((opt) => opt.value === value)?.label || ""
  }, [options, value])

  return (
    <div className={cn("relative w-full", className)} ref={wrapperRef}>
      <div
        className={cn(
          "flex h-[50px] w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm ring-offset-background transition-all cursor-pointer dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100",
          isOpen && "ring-2 ring-emerald-500/20 border-emerald-500",
          disabled && "cursor-not-allowed opacity-50 bg-slate-100 dark:bg-slate-800",
          className
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={cn("block truncate", !value && "text-slate-500 dark:text-slate-400")}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="sticky top-0 z-10 bg-white p-2 dark:bg-slate-900">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                placeholder="Cari..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">
                Tidak ditemukan.
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm outline-none hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-700 dark:text-slate-200",
                    value === option.value && "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium"
                  )}
                  onClick={() => {
                    onChange(option.value, option.label)
                    setIsOpen(false)
                    setSearch("")
                  }}
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  {value === option.value && (
                    <Check className="ml-2 h-4 w-4" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
