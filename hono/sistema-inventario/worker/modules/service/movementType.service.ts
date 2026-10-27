import { NotFoundError } from '../../lib/errors'
import { MovementTypeRepository } from '../repository/movementType.repository'
import type { MovementTypeSelect } from '../repository/movementType.repository'

export class MovementTypeService {
  private repo: MovementTypeRepository

  constructor(repo: MovementTypeRepository) {
    this.repo = repo
  }

  async getAll(): Promise<MovementTypeSelect[]> {
    return this.repo.findAll()
  }

  async getById(code: string): Promise<MovementTypeSelect> {
    const found = await this.repo.findByCode(code)
    if (!found) throw new NotFoundError('Tipo de movimiento no encontrado')
    return found
  }
}
