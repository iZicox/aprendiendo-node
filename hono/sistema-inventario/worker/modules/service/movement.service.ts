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
} from '../../lib/db-errors'
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors'
import { toPage } from '../../lib/pagination'
import type { CreateMovementInput, CreateTransferInput } from '../validators'
import { MovementRepository } from '../repository/movement.repository'
import { MovementTypeRepository } from '../repository/movementType.repository'
import { ProductsRepository } from '../repository/products.repository'
import { LocationRepository } from '../repository/location.repository'

const TRANSFER_OUT = 'TRANSFER_OUT'
const TRANSFER_IN = 'TRANSFER_IN'

export class MovementService {
  private repo: MovementRepository
  private movementTypeRepo: MovementTypeRepository
  private productsRepo: ProductsRepository
  private locationRepo: LocationRepository

  constructor(
    repo: MovementRepository,
    movementTypeRepo: MovementTypeRepository,
    productsRepo: ProductsRepository,
    locationRepo: LocationRepository,
  ) {
    this.repo = repo
    this.movementTypeRepo = movementTypeRepo
    this.productsRepo = productsRepo
    this.locationRepo = locationRepo
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
    productId: number,
    query: PaginationQuery,
  ): Promise<Page<SelectMovement>> {
    const product = await this.productsRepo.findById(productId)
    if (!product) throw new NotFoundError('Producto no encontrado')

    const { items, total } = await this.repo.findByProductId(productId, query)
    return toPage(items, total, query)
  }

  async getByLocationId(
    locationId: number,
    query: PaginationQuery,
  ): Promise<Page<SelectMovement>> {
    const location = await this.locationRepo.findById(locationId)
    if (!location) throw new NotFoundError('Ubicacion no encontrada')

    const { items, total } = await this.repo.findByLocationId(locationId, query)
    return toPage(items, total, query)
  }

  async getByLocationIdAndProductId(
    locationId: number,
    productId: number,
    query: PaginationQuery,
  ): Promise<Page<SelectMovement>> {
    const [product, location] = await Promise.all([
      this.productsRepo.findById(productId),
      this.locationRepo.findById(locationId),
    ])
    if (!product) throw new NotFoundError('Producto no encontrado')
    if (!location) throw new NotFoundError('Ubicacion no encontrada')

    const { items, total } = await this.repo.findByLocationIdAndProductId(
      locationId,
      productId,
      query,
    )
    return toPage(items, total, query)
  }

  async insert(movement: CreateMovementInput): Promise<SelectMovement> {
    if (movement.movementTypeCode.startsWith('TRANSFER_')) {
      throw new BadRequestError(
        'Las transferencias deben registrarse con POST /api/movements/transfer',
      )
    }
    if (movement.quantity <= 0) {
      throw new BadRequestError('La cantidad debe ser mayor a cero')
    }

    const movementType = await this.movementTypeRepo.findByCode(
      movement.movementTypeCode,
    )
    if (!movementType) {
      throw new NotFoundError('Tipo de movimiento no encontrado')
    }

    const sign = this.assertSign(movementType.sign, movement.movementTypeCode)

    try {
      return await this.repo.insert(movement, sign)
    } catch (e) {
      this.rethrowPersistenceError(e)
    }
  }

  // Crea las dos piernas (OUT + IN) en un único batch atómico.
  async transfer(
    input: CreateTransferInput,
  ): Promise<[SelectMovement, SelectMovement]> {
    const [outType, inType] = await Promise.all([
      this.movementTypeRepo.findByCode(TRANSFER_OUT),
      this.movementTypeRepo.findByCode(TRANSFER_IN),
    ])
    if (!outType || !inType) {
      throw new Error(
        'Los tipos de movimiento de transferencia no están configurados',
      )
    }
    this.assertSign(outType.sign, TRANSFER_OUT)
    this.assertSign(inType.sign, TRANSFER_IN)

    const transferId =
      input.transferId ?? `TRF-${crypto.randomUUID().toUpperCase()}`
    if (await this.repo.existsTransferId(transferId)) {
      throw new ConflictError('Ya existe una transferencia con ese ID')
    }

    const common = {
      productId: input.productId,
      quantity: input.quantity,
      transferId,
      note: input.note,
    }
    const outMovement: NewMovement = {
      ...common,
      locationId: input.fromLocationId,
      movementTypeCode: TRANSFER_OUT,
    }
    const inMovement: NewMovement = {
      ...common,
      locationId: input.toLocationId,
      movementTypeCode: TRANSFER_IN,
    }

    try {
      return await this.repo.transfer(outMovement, inMovement)
    } catch (e) {
      this.rethrowPersistenceError(e)
    }
  }

  private assertSign(sign: number, code: string): MovementSign {
    if (sign !== 1 && sign !== -1) {
      throw new Error(`El tipo de movimiento ${code} tiene un signo inválido`)
    }
    return sign
  }

  private rethrowPersistenceError(error: unknown): never {
    if (isStockNonNegativeViolation(error)) {
      throw new ConflictError('Stock insuficiente para realizar el movimiento')
    }
    if (isForeignKeyViolation(error)) {
      throw new NotFoundError('Producto o ubicación no encontrados')
    }
    throw new Error('No se pudo registrar el movimiento', { cause: error })
  }
}
