// worker/modules/products/products.service.ts
// Reglas de negocio. No conoce Hono ni SQL.
import type { Page, PaginationQuery, Product } from '../../db/types'
import { isForeignKeyViolation, isUniqueViolation } from '../../lib/db-errors'
import { ConflictError, NotFoundError } from '../../lib/errors'
import { toPage } from '../../lib/pagination'
import type { CreateProductInput, UpdateProductInput } from '../validators'
import type { ProductsRepository } from '../repository/products.repository'

export class ProductsService {
  private repo: ProductsRepository

  constructor(repo: ProductsRepository) {
    this.repo = repo
  }

  async getAll(query: PaginationQuery): Promise<Page<Product>> {
    const { items, total } = await this.repo.findAll(query)
    return toPage(items, total, query)
  }

  async getById(id: number): Promise<Product> {
    const found = await this.repo.findById(id)
    if (!found) throw new NotFoundError('Producto no encontrado')
    return found
  }

  async getBySku(sku: string): Promise<Product> {
    const found = await this.repo.findBySku(sku)
    if (!found) throw new NotFoundError('Producto no encontrado')
    return found
  }

  async create(input: CreateProductInput): Promise<Product> {
    if (await this.repo.findBySku(input.sku)) {
      throw new ConflictError('Ya existe un producto con ese SKU')
    }

    try {
      return await this.repo.create(input)
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictError('Ya existe un producto con ese SKU')
      }
      throw e
    }
  }

  async update(id: number, input: UpdateProductInput): Promise<Product> {
    await this.getById(id) // lanza 404 si no existe

    const sameSku = await this.repo.findBySku(input.sku)
    if (sameSku && sameSku.id !== id) {
      throw new ConflictError('Ya existe un producto con ese SKU')
    }

    try {
      return await this.repo.update(id, input)
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictError('Ya existe un producto con ese SKU')
      }
      throw e
    }
  }

  async remove(id: number): Promise<void> {
    await this.getById(id) // lanza 404 si no existe

    // El historial de movimientos es inmutable: un producto con
    // movimientos no se puede borrar.
    if (await this.repo.hasMovements(id)) {
      throw new ConflictError(
        'No se puede eliminar un producto con movimientos',
      )
    }

    try {
      const deleted = await this.repo.delete(id)
      if (!deleted) throw new NotFoundError('Producto no encontrado')
    } catch (e) {
      if (isForeignKeyViolation(e)) {
        throw new ConflictError(
          'No se puede eliminar un producto con movimientos',
        )
      }
      throw e
    }
  }
}
