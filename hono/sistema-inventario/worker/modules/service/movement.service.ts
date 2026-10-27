import type { MovementSign, NewMovement, SelectMovement } from '../../db/types'
import {
  isForeignKeyViolation,
  isStockNonNegativeViolation,
} from '../../lib/db-erros'
import {
  BadRequestError,
  ConflictError,
  IllegalMovement,
  NotFoundError,
} from '../../lib/errors'
import { MovementRepository } from '../repository/movement.repository'
import { MovementTypeRepository } from '../repository/movementType.repository'

export class MovementService {
  private repo: MovementRepository
  private movementTypeRepo: MovementTypeRepository

  constructor(
    repo: MovementRepository,
    movementTypeRepo: MovementTypeRepository,
  ) {
    this.repo = repo
    this.movementTypeRepo = movementTypeRepo
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
    if (sign !== 1 && sign !== -1)
      throw new IllegalMovement('Movimiento no permitido')
    if (movement.quantity <= 0)
      throw new BadRequestError('La cantidad debe ser mayor a cero')

    const movementType = await this.movementTypeRepo.findByCode(
      movement.movementTypeCode,
    )
    if (!movementType)
      throw new NotFoundError('Tipo de movimiento no encontrado')
    if (movementType.sign !== sign)
      throw new IllegalMovement(
        'El signo no coincide con el tipo de movimiento',
      )

    try {
      return await this.repo.insert(movement, sign)
    } catch (e) {
      if (isStockNonNegativeViolation(e)) {
        throw new ConflictError(
          'Stock insuficiente para realizar el movimiento',
        )
      }
      if (isForeignKeyViolation(e)) {
        throw new NotFoundError('Producto o ubicación no encontrados')
      }
      throw new Error('No se pudo registrar el movimiento', {
        cause: e,
      })
    }
  }
}
