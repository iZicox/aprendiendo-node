import type { Location } from '../../types/api'
import { Select } from '../ui/Select'

interface LocationSelectProps {
  id: string
  locations: Location[]
  value: string
  onChange: (value: string) => void
  loading?: boolean
  disabled?: boolean
  invalid?: boolean
  placeholder?: string
}

export function LocationSelect({
  id,
  locations,
  value,
  onChange,
  loading = false,
  disabled = false,
  invalid = false,
  placeholder = 'Selecciona una ubicación',
}: LocationSelectProps) {
  return (
    <Select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled || loading}
      invalid={invalid}
    >
      <option value="">
        {loading
          ? 'Cargando ubicaciones…'
          : locations.length === 0
            ? 'No hay ubicaciones disponibles'
            : placeholder}
      </option>
      {locations.map((location) => (
        <option key={location.id} value={location.id}>
          {location.code}
        </option>
      ))}
    </Select>
  )
}
