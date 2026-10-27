import {
  Page,
  PageOpts,
  PaginationQuery,
  StockAuditRow,
  StockLocationTotal,
  StockProductTotal,
  StockProductTotalWithId,
  StockRow,
} from '../../db/types'
import { NotFoundError } from '../../lib/errors'
import { StockRepository } from '../repository/stock.repository'

export class StockService {
  private repo: StockRepository

  constructor(repo: StockRepository) {
    this.repo = repo
  }

  async getTotal(): Promise<number> {
    return this.repo.getTotal()
  }

  async getProductTotal(productId: number): Promise<StockProductTotal> {
    const row = await this.repo.getProductTotal(productId)
    if (!row) throw new NotFoundError('Producto no encontrado')
    return row
  }

  async getLocationTotal(locationId: number): Promise<number> {
    return this.repo.getLocationTotal(locationId)
  }

  async getProductInLocation(
    productId: number,
    locationId: number,
  ): Promise<StockRow> {
    const row = await this.repo.getProductInLocation(productId, locationId)
    if (!row) {
      throw new NotFoundError(
        'Stock no encontrado para ese producto en esa ubicación',
      )
    }
    return row
  }

  async getSummary(opts: PageOpts): Promise<Page<StockRow>> {
    return this.repo.getSummary(opts)
  }

  async getLocationSummary(
    locationId: number,
    opts: PageOpts,
  ): Promise<Page<StockRow>> {
    return this.repo.getLocationSummary(locationId, opts)
  }

  async getTotalsByProduct(
    opts: PaginationQuery,
  ): Promise<Page<StockProductTotalWithId>> {
    return this.repo.getTotalsByProduct(opts)
  }

  async getTotalsByLocation(): Promise<StockLocationTotal[]> {
    return this.repo.getTotalsByLocation()
  }

  async getOutOfStock(
    opts: PaginationQuery,
  ): Promise<Page<StockProductTotalWithId>> {
    return this.repo.getOutOfStock(opts)
  }

  async getBySku(sku: string): Promise<StockRow[]> {
    const rows = await this.repo.getBySku(sku)
    if (rows.length === 0) throw new NotFoundError('Producto no encontrado')
    return rows
  }

  async getAudit(): Promise<StockAuditRow[]> {
    return this.repo.getAudit()
  }
}
