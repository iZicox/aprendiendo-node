import { NotFoundError } from "../../lib/errors";
import { MovementTypeRepository } from "../repository/movementType.repository";



export class MovementTypeService {
    constructor(private repo: MovementTypeRepository) { }

    getAll() {
        const data = this.repo.findAll()
        if (!data) throw new NotFoundError("tipos de movimientos no encontrados");
        return data
    }

    getById(code: string) {
        const found = this.repo.findByCode(code)
        if (!found) throw new NotFoundError("no encontrado");
        return found
    }
}