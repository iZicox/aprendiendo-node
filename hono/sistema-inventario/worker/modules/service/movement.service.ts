import type {
  MovementSign,
  NewMovement,
  NewMovementOperation,
  OperationKind,
  Page,
  PaginationQuery,
  SelectMovement,
  SelectMovementOperation,
} from '../../db/types'
import {
  isForeignKeyViolation,
  isStockNonNegativeViolation,
  isUniqueViolation,
} from '../../lib/db-errors'
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors'
import { hashRequest, type IdempotencyContext } from '../../lib/idempotency'
import { toPage } from '../../lib/pagination'
import type { CreateMovementInput, CreateTransferInput } from '../validators'
import { MovementRepository } from '../repository/movement.repository'
import { MovementTypeRepository } from '../repository/movementType.repository'
import { ProductsRepository } from '../repository/products.repository'
import { LocationRepository } from '../repository/location.repository'

const TRANSFER_OUT = 'TRANSFER_OUT'
const TRANSFER_IN = 'TRANSFER_IN'

// Resultado de una creación idempotente: `replayed` indica que se respondió
// con el resultado original en vez de crear algo nuevo.
export type IdempotentResult<T> = {
  value: T
  replayed: boolean
}

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

  async insert(
    movement: CreateMovementInput,
    ctx: IdempotencyContext,
  ): Promise<IdempotentResult<SelectMovement>> {
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

    // 1) Mismo payload => mismo hash. Si la llave ya existe con otro hash es
    //    un reintento mal usado (409); si coincide, se devuelve el original.
    const hash = await hashRequest('movement', {
      productId: movement.productId,
      locationId: movement.locationId,
      movementTypeCode: movement.movementTypeCode,
      quantity: movement.quantity,
      note: movement.note ?? null,
    })

    const existing = await this.repo.findOperation(ctx.userId, ctx.key)
    if (existing) {
      return {
        value: await this.replayMovement(existing, hash),
        replayed: true,
      }
    }

    const operation: NewMovementOperation = {
      id: crypto.randomUUID(),
      userId: ctx.userId,
      idempotencyKey: ctx.key,
      requestHash: hash,
      kind: 'movement',
    }

    try {
      return {
        value: await this.repo.insert(operation, movement, sign),
        replayed: false,
      }
    } catch (e) {
      // Dos requests con la misma llave a la vez: una gana con la unique de
      // (user_id, idempotency_key) y la otra responde con el replay.
      if (isUniqueViolation(e)) {
        const raced = await this.repo.findOperation(ctx.userId, ctx.key)
        if (raced) {
          return {
            value: await this.replayMovement(raced, hash),
            replayed: true,
          }
        }
      }
      this.rethrowPersistenceError(e)
    }
  }

  // Crea las dos piernas (OUT + IN) en un único batch atómico.
  async transfer(
    input: CreateTransferInput,
    ctx: IdempotencyContext,
  ): Promise<IdempotentResult<[SelectMovement, SelectMovement]>> {
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

    // El hash usa el transferId tal como llegó (o null): si no vino, el id
    // generado en el primer intento no participa del hash, así el reintento
    // con el mismo payload sigue coincidiendo.
    const hash = await hashRequest('transfer', {
      productId: input.productId,
      fromLocationId: input.fromLocationId,
      toLocationId: input.toLocationId,
      quantity: input.quantity,
      transferId: input.transferId ?? null,
      note: input.note ?? null,
    })

    const existing = await this.repo.findOperation(ctx.userId, ctx.key)
    if (existing) {
      return {
        value: await this.replayTransfer(existing, hash),
        replayed: true,
      }
    }

    const transferId =
      input.transferId ?? `TRF-${crypto.randomUUID().toUpperCase()}`
    if (await this.repo.existsTransferId(transferId)) {
      throw new ConflictError('Ya existe una transferencia con ese ID')
    }

    const operation: NewMovementOperation = {
      id: crypto.randomUUID(),
      userId: ctx.userId,
      idempotencyKey: ctx.key,
      requestHash: hash,
      kind: 'transfer',
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
      return {
        value: await this.repo.transfer(operation, outMovement, inMovement),
        replayed: false,
      }
    } catch (e) {
      if (isUniqueViolation(e)) {
        const raced = await this.repo.findOperation(ctx.userId, ctx.key)
        if (raced) {
          return {
            value: await this.replayTransfer(raced, hash),
            replayed: true,
          }
        }
        // La carrera pudo ser por un transferId repetido (unique de pierna).
        if (await this.repo.existsTransferId(transferId)) {
          throw new ConflictError('Ya existe una transferencia con ese ID')
        }
      }
      this.rethrowPersistenceError(e)
    }
  }

  // ── Replays ───────────────────────────────────────────────

  private assertReplay(
    operation: SelectMovementOperation,
    hash: string,
    kind: OperationKind,
  ): void {
    if (operation.kind !== kind || operation.requestHash !== hash) {
      throw new ConflictError('Idempotency-Key reutilizada con otro payload')
    }
  }

  private async replayMovement(
    operation: SelectMovementOperation,
    hash: string,
  ): Promise<SelectMovement> {
    this.assertReplay(operation, hash, 'movement')

    const [replayed] = await this.repo.findMovementsByOperationId(operation.id)
    if (!replayed) {
      throw new Error('La operación idempotente no tiene movimientos')
    }
    return replayed
  }

  private async replayTransfer(
    operation: SelectMovementOperation,
    hash: string,
  ): Promise<[SelectMovement, SelectMovement]> {
    this.assertReplay(operation, hash, 'transfer')

    const movements = await this.repo.findMovementsByOperationId(operation.id)
    const out = movements.find((row) => row.movementTypeCode === TRANSFER_OUT)
    const inMovement = movements.find(
      (row) => row.movementTypeCode === TRANSFER_IN,
    )
    if (!out || !inMovement) {
      throw new Error('La transferencia idempotente está incompleta')
    }
    return [out, inMovement]
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
    if (isUniqueViolation(error)) {
      throw new ConflictError('Ya existe un registro con esos datos')
    }
    throw new Error('No se pudo registrar el movimiento', { cause: error })
  }
}
