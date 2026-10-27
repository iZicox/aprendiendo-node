import { MovementSign, NewMovement, SelectMovement } from '../../db/types'
import { IllegalMovement, NotFoundError } from '../../lib/errors'
import { MovementRepository } from '../repository/movement.repository'

export class MovementService {
  private repo: MovementRepository

  constructor(repo: MovementRepository) {
    this.repo = repo
  }

  async getAll(): Promise<SelectMovement[]> {
    return this.repo.findAll()
  }

  async getById(id: number): Promise<SelectMovement> {
    const row = await this.repo.findById(id)
    if (!row) throw new NotFoundError('Movimiento no encontrado')
    return row
  }

  async getByProductId(id: number): Promise<SelectMovement[]> {
    const rows = await this.repo.findByProductId(id)
    if (rows.length === 0) throw new NotFoundError('Movimientos no encontrados')
    return rows
  }

  async getByLocationId(id: number): Promise<SelectMovement[]> {
    const rows = await this.repo.findByLocationId(id)
    if (rows.length === 0) throw new NotFoundError('Movimientos no encontrados')
    return rows
  }

  async getByLocationIdAndProductId(
    locationId: number,
    productId: number,
  ): Promise<SelectMovement[]> {
    const rows = await this.repo.findByLocationIdAndProductId(
      locationId,
      productId,
    )
    if (rows.length === 0) throw new NotFoundError('Movimientos no encontrados')
    return rows
  }

  async insert(
    movement: NewMovement,
    sign: MovementSign,
  ): Promise<SelectMovement> {
    try {
      if (sign !== 1 && sign !== -1)
        throw new IllegalMovement('Movimiento no permitido')
      if (movement.quantity <= 0)
        throw new Error('La cantidad debe ser mayor a cero')
      const newMovement = await this.repo.insert(movement, sign)
      return newMovement
    } catch (e) {
      throw new Error('No se pudo registrar el movimiento', {
        cause: e,
      })
    }
  }
}
