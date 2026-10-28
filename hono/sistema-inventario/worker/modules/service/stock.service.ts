import type {
  Page,
  PageOpts,
  PaginationQuery,
  StockAuditRow,
  StockLocationTotal,
  StockProductTotal,
  StockRow,
  StockTotal,
} from '../../db/types'
import { NotFoundError } from '../../lib/errors'
import { LocationRepository } from '../repository/location.repository'
import { StockRepository } from '../repository/stock.repository'

export class StockService {
  private repo: StockRepository
  private locationRepo: LocationRepository

  constructor(repo: StockRepository, locationRepo: LocationRepository) {
    this.repo = repo
    this.locationRepo = locationRepo
  }

  private async ensureLocationExists(locationId: number): Promise<void> {
    const location = await this.locationRepo.findById(locationId)
    if (!location) throw new NotFoundError('Ubicacion no encontrada')
  }

  async getTotal(): Promise<StockTotal> {
    return { total: await this.repo.getTotal() }
  }

  async getProductTotal(productId: number): Promise<StockProductTotal> {
    const row = await this.repo.getProductTotal(productId)
    if (!row) throw new NotFoundError('Producto no encontrado')
    return row
  }

  async getLocationTotal(locationId: number): Promise<StockLocationTotal> {
    const row = await this.repo.getLocationTotal(locationId)
    if (!row) throw new NotFoundError('Ubicacion no encontrada')
    return row
  }

  async getProductInLocation(
    productId: number,
    locationId: number,
  ): Promise<StockRow> {
    await this.ensureLocationExists(locationId)

    const row = await this.repo.getProductInLocation(productId, locationId)
    if (!row) throw new NotFoundError('Producto no encontrado')
    return row
  }

  async getSummary(opts: PageOpts): Promise<Page<StockRow>> {
    return this.repo.getSummary(opts)
  }

  async getLocationSummary(
    locationId: number,
    opts: PageOpts,
  ): Promise<Page<StockRow>> {
    await this.ensureLocationExists(locationId)
    return this.repo.getLocationSummary(locationId, opts)
  }

  async getTotalsByProduct(
    opts: PaginationQuery,
  ): Promise<Page<StockProductTotal>> {
    return this.repo.getTotalsByProduct(opts)
  }

  async getTotalsByLocation(): Promise<StockLocationTotal[]> {
    return this.repo.getTotalsByLocation()
  }

  async getOutOfStock(opts: PaginationQuery): Promise<Page<StockProductTotal>> {
    return this.repo.getOutOfStock(opts)
  }

  async getBySku(sku: string): Promise<StockRow[]> {
    const rows = await this.repo.getBySku(sku)
    if (rows.length === 0) throw new NotFoundError('Producto no encontrado')
    return rows
  }

  async getByProductId(productId: number): Promise<StockRow[]> {
    const rows = await this.repo.getByProductId(productId)
    if (rows.length === 0) throw new NotFoundError('Producto no encontrado')
    return rows
  }

  async getAudit(opts: PaginationQuery): Promise<Page<StockAuditRow>> {
    return this.repo.getAudit(opts)
  }
}
