import { useId, useMemo, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { useLocationSearch } from '../../hooks/useLocationSearch'
import { cn } from '../../lib/cn'
import type { Location } from '../../types/api'
import { ChevronDownIcon } from '../icons'
import { Input } from '../ui/Input'
import { Spinner } from '../ui/Spinner'

interface LocationSearchSelectProps {
  id: string
  value: Location | null
  onChange: (location: Location | null) => void
  disabled?: boolean
  placeholder?: string
}

const LIMIT = 10

// Combobox de ubicaciones: input que filtra contra el servidor por código.
// - Al enfocar abre la lista con las primeras ubicaciones.
// - Al escribir pide GET /locations/search?search=... (con debounce).
// - Al elegir una opción devuelve el Location al padre.
// Si el usuario escribe sin elegir, el padre sigue viendo la última selección.
export function LocationSearchSelect({
  id,
  value,
  onChange,
  disabled = false,
  placeholder = 'Escribe para buscar una ubicación…',
}: LocationSearchSelectProps) {
  const baseId = useId()

  const [inputValue, setInputValue] = useState(value?.code ?? '')
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const { locations, loading, error } = useLocationSearch(
    searchTerm,
    LIMIT,
    open && !disabled,
  )

  // Cerrado, el input muestra la ubicación elegida (así también se ve la que
  // llega después desde fuera). Abierto, muestra lo que el usuario escribe.
  const shownValue = open || !value ? inputValue : value.code

  // La ubicación elegida se mantiene en la lista aunque no esté en la página de resultados.
  const options = useMemo(() => {
    if (!value) return locations
    return locations.some((location) => location.id === value.id)
      ? locations
      : [value, ...locations]
  }, [locations, value])

  const safeActiveIndex = Math.min(activeIndex, options.length - 1)
  const listboxId = `${baseId}-listbox`
  const optionId = (location: Location) => `${baseId}-option-${location.id}`

  function handleFocus() {
    if (disabled) return
    setActiveIndex(0)
    setOpen(true)
    setSearchTerm(value ? '' : inputValue)
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const text = event.target.value
    setInputValue(text)
    setSearchTerm(text)
    setActiveIndex(0)
    setOpen(true)
  }

  function select(location: Location) {
    setInputValue(location.code)
    setSearchTerm('')
    setActiveIndex(0)
    setOpen(false)
    onChange(location)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!disabled) setOpen(true)
      setActiveIndex((current) => Math.min(current + 1, options.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      const active = options[safeActiveIndex]
      if (open && active) {
        event.preventDefault()
        select(active)
      }
      return
    }
    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault()
        setOpen(false)
      }
      return
    }
    if (event.key === 'Tab') setOpen(false)
  }

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && options[safeActiveIndex]
            ? optionId(options[safeActiveIndex])
            : undefined
        }
        autoComplete="off"
        spellCheck={false}
        className="pr-9 font-mono uppercase"
        value={shownValue}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />

      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
        {loading ? (
          <Spinner
            className="h-4 w-4 text-slate-400"
            label="Buscando ubicaciones"
          />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-slate-400" />
        )}
      </span>

      {open && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Ubicaciones"
          className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {error ? (
            <p className="px-3 py-2 text-sm text-rose-600">{error}</p>
          ) : loading && options.length === 0 ? (
            <p className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
              <Spinner className="h-4 w-4" />
              Buscando ubicaciones…
            </p>
          ) : options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500">
              No se encontraron ubicaciones
              {searchTerm ? ` para «${searchTerm}»` : ''}.
            </p>
          ) : (
            options.map((location, index) => (
              <div
                key={location.id}
                id={optionId(location)}
                role="option"
                aria-selected={value?.id === location.id}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(location)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm',
                  index === safeActiveIndex
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-700',
                  value?.id === location.id && 'font-semibold',
                )}
              >
                <span className="truncate font-mono">{location.code}</span>
                <span className="text-xs text-slate-400">#{location.id}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
