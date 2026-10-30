import { Badge } from '../ui/Badge'

export function StockStatusBadge({ quantity }: { quantity: number }) {
  if (quantity <= 0) {
    return <Badge variant="rose">Sin stock</Badge>
  }

  if (quantity <= 5) {
    return <Badge variant="amber">Stock bajo</Badge>
  }

  return <Badge variant="emerald">Disponible</Badge>
}
