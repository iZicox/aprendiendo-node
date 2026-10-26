// worker/modules/products/products.service.ts
// Reglas de negocio. No conoce Hono ni SQL.
import {
  CreateProductInput,
  NewProduct,
  Page,
  PaginationQuery,
  Product,
  UpdateProductInput,
} from '../../db/types'
import { ConflictError, NotFoundError } from '../../lib/errors'
import { toPage } from '../../lib/pagination'
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

  async create(input: CreateProductInput): Promise<NewProduct> {
    if (await this.repo.findBySku(input.sku)) {
      throw new ConflictError('Ya existe un producto con ese SKU')
    }
    return this.repo.create(input)
  }

  async update(id: number, input: UpdateProductInput): Promise<Product> {
    await this.getById(id) // lanza 404 si no existe

    const sameSku = await this.repo.findBySku(input.sku)
    if (sameSku && sameSku.id !== id) {
      throw new ConflictError('Ya existe un producto con ese SKU')
    }
    return this.repo.update(id, input)
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
    await this.repo.delete(id)
  }
}
