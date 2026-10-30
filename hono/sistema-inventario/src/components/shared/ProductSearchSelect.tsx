import { useEffect, useId, useMemo, useState } from 'react'
import type { ChangeEvent, KeyboardEvent, MouseEvent } from 'react'
import { useProductSearch } from '../../hooks/useProductSearch'
import { cn } from '../../lib/cn'
import type { Product } from '../../types/api'
import { ChevronDownIcon, CloseIcon } from '../icons'
import { Input } from '../ui/Input'
import { Spinner } from '../ui/Spinner'

interface ProductSearchSelectProps {
  id: string
  value: Product | null
  onChange: (product: Product | null) => void
  disabled?: boolean
  invalid?: boolean
  placeholder?: string
}

const LIMIT = 10

// Combobox de productos: input con búsqueda por SKU contra el servidor.
// - Al enfocar abre la lista (sin filtro si hay selección).
// - Al escribir filtra con GET /products?search=... y limpia la selección.
// - Al elegir una opción devuelve el objeto Product al padre.
export function ProductSearchSelect({
  id,
  value,
  onChange,
  disabled = false,
  invalid = false,
  placeholder = 'Escribe para buscar por SKU…',
}: ProductSearchSelectProps) {
  const baseId = useId()

  const [inputValue, setInputValue] = useState(value?.sku ?? '')
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const { products, loading, error } = useProductSearch(
    searchTerm,
    LIMIT,
    open && !disabled,
  )

  // El producto seleccionado se mantiene visible aunque no aparezca en la
  // primera página de resultados.
  const options = useMemo(() => {
    if (!value) return products
    return products.some((product) => product.id === value.id)
      ? products
      : [value, ...products]
  }, [products, value])

  // Se acota por si la lista se achica tras mover el foco con el teclado.
  const safeActiveIndex = Math.min(activeIndex, options.length - 1)
  const activeProduct =
    open && safeActiveIndex >= 0 ? options[safeActiveIndex] : undefined
  const listboxId = `${baseId}-listbox`
  const optionId = (product: Product) => `${baseId}-option-${product.id}`

  useEffect(() => {
    if (!activeProduct) return
    document
      .getElementById(optionId(activeProduct))
      ?.scrollIntoView({ block: 'nearest' })
    // optionId depende de baseId (estable) y del producto activo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, open, activeProduct])

  function handleFocus() {
    if (disabled) return
    setActiveIndex(0)
    setOpen(true)
    // Con selección se listan todos; sin selección, se repite el texto actual.
    setSearchTerm(value ? '' : inputValue)
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const text = event.target.value
    setInputValue(text)
    setSearchTerm(text)
    setActiveIndex(0)
    setOpen(true)
    if (value && text !== value.sku) onChange(null)
  }

  function select(product: Product) {
    setInputValue(product.sku)
    setSearchTerm('')
    setActiveIndex(0)
    setOpen(false)
    onChange(product)
  }

  function clear(event: MouseEvent<HTMLButtonElement>) {
    // Evita que el input pierda el foco al hacer clic en el botón.
    event.preventDefault()
    setInputValue('')
    setSearchTerm('')
    setActiveIndex(0)
    setOpen(true)
    onChange(null)
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
      if (open && activeProduct) {
        event.preventDefault()
        select(activeProduct)
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
          activeProduct ? optionId(activeProduct) : undefined
        }
        aria-invalid={invalid}
        autoComplete="off"
        spellCheck={false}
        className="pr-9 font-mono"
        value={inputValue}
        placeholder={placeholder}
        disabled={disabled}
        invalid={invalid}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />

      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
        {value && !disabled ? (
          <button
            type="button"
            aria-label="Limpiar producto"
            className="pointer-events-auto rounded-md p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clear}
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        ) : loading ? (
          <Spinner
            className="h-4 w-4 text-slate-400"
            label="Buscando productos"
          />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-slate-400" />
        )}
      </span>

      {open && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Productos"
          className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {error ? (
            <p className="px-3 py-2 text-sm text-rose-600">{error}</p>
          ) : loading && options.length === 0 ? (
            <p className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
              <Spinner className="h-4 w-4" />
              Buscando productos…
            </p>
          ) : options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500">
              No se encontraron productos
              {searchTerm ? ` para «${searchTerm}»` : ''}.
            </p>
          ) : (
            options.map((product, index) => (
              <div
                key={product.id}
                id={optionId(product)}
                role="option"
                aria-selected={value?.id === product.id}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(product)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm',
                  index === safeActiveIndex
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-700',
                  value?.id === product.id && 'font-semibold',
                )}
              >
                <span className="truncate font-mono">{product.sku}</span>
                <span className="text-xs text-slate-400">#{product.id}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
