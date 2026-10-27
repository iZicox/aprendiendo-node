import type {
  MovementSign,
  NewMovement,
  Page,
  PaginationQuery,
  SelectMovement,
} from '../../db/types'
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
import { toPage } from '../../lib/pagination'
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

  async getAll(query: PaginationQuery): Promise<Page<SelectMovement>> {
    const { items, total } = await this.repo.findAll(query)
    return toPage(items, total, query)
  }

  async getById(id: number): Promise<SelectMovement> {
    const row = await this.repo.findById(id)
    if (!row) throw new NotFoundError('Movimiento no encontrado')
    return row
  }

  async getByProductId(
    id: number,
    query: PaginationQuery,
  ): Promise<Page<SelectMovement>> {
    const { items, total } = await this.repo.findByProductId(id, query)
    if (total === 0) throw new NotFoundError('Movimientos no encontrados')
    return toPage(items, total, query)
  }

  async getByLocationId(
    id: number,
    query: PaginationQuery,
  ): Promise<Page<SelectMovement>> {
    const { items, total } = await this.repo.findByLocationId(id, query)
    if (total === 0) throw new NotFoundError('Movimientos no encontrados')
    return toPage(items, total, query)
  }

  async getByLocationIdAndProductId(
    locationId: number,
    productId: number,
    query: PaginationQuery,
  ): Promise<Page<SelectMovement>> {
    const { items, total } = await this.repo.findByLocationIdAndProductId(
      locationId,
      productId,
      query,
    )
    if (total === 0) throw new NotFoundError('Movimientos no encontrados')
    return toPage(items, total, query)
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
