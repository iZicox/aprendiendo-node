// worker/modules/products/products.service.ts
// Reglas de negocio. No conoce Hono ni SQL.
import { ConflictError, NotFoundError } from '../../lib/errors'
import type { ProductsRepository } from '../repository/products.repository'
import type { CreateProductInput, UpdateProductInput } from '../validators'

export class ProductsService {
    constructor(private repo: ProductsRepository) { }

    getAll() {
        return this.repo.findAll()
    }

    async getById(id: number) {
        const found = await this.repo.findById(id)
        if (!found) throw new NotFoundError('Producto no encontrado')
        return found
    }

    async create(input: CreateProductInput) {
        if (await this.repo.findBySku(input.sku)) {
            throw new ConflictError('Ya existe un producto con ese SKU')
        }
        return this.repo.create(input)
    }

    async update(id: number, input: UpdateProductInput) {
        await this.getById(id) // lanza 404 si no existe

        const sameSku = await this.repo.findBySku(input.sku)
        if (sameSku && sameSku.id !== id) {
            throw new ConflictError('Ya existe un producto con ese SKU')
        }
        return this.repo.update(id, input)
    }

    async remove(id: number) {
        await this.getById(id) // lanza 404 si no existe

        // El historial de movimientos es inmutable: un producto con
        // movimientos no se puede borrar.
        if (await this.repo.hasMovements(id)) {
            throw new ConflictError('No se puede eliminar un producto con movimientos')
        }
        await this.repo.delete(id)
    }
}