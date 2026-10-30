import type { MovementType } from '../../types/api'
import { Select } from '../ui/Select'

interface MovementTypeSelectProps {
  id: string
  movementTypes: MovementType[]
  value: string
  onChange: (value: string) => void
  loading?: boolean
  disabled?: boolean
  invalid?: boolean
}

export function MovementTypeSelect({
  id,
  movementTypes,
  value,
  onChange,
  loading = false,
  disabled = false,
  invalid = false,
}: MovementTypeSelectProps) {
  const available = movementTypes.filter(
    (movementType) => !movementType.code.startsWith('TRANSFER_'),
  )

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
          ? 'Cargando tipos…'
          : available.length === 0
            ? 'No hay tipos disponibles'
            : 'Selecciona un tipo de movimiento'}
      </option>
      {available.map((movementType) => (
        <option key={movementType.code} value={movementType.code}>
          {movementType.code} · {movementType.description} (
          {movementType.sign > 0 ? '+' : ''}
          {movementType.sign})
        </option>
      ))}
    </Select>
  )
}
