import type { InsertLocation, SelectLocation } from "../../db/types";
import { isForeignKeyViolation, isUniqueViolation } from "../../lib/db-erros";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { LocationRepository } from "../repository/location.repository";




export class LocationService{
    private repo: LocationRepository

    constructor(repo: LocationRepository){
        this.repo = repo
    }

    async getAll(): Promise<SelectLocation[]>{
        const row = await this.repo.findAll()
        return row
    }

    async getById(id: number): Promise<SelectLocation>{
        const row = await this.repo.findById(id)
        if(!row) throw new NotFoundError('Ubicacion no encontrada')
        return row
    }

    async create(data: InsertLocation): Promise<SelectLocation>{
        try{
            const row = await this.repo.create(data)
            return row
        }catch(e){
            if(isUniqueViolation(e)){
                throw new ConflictError('Ya existe una ubicacion con ese codigo')
            }
            throw e
        }
        
    }

    async delete (id: number): Promise<SelectLocation>{
        try{
           const row = await this.repo.delete(id)
            if(!row) throw new NotFoundError('Ubicacion no encontrada')
            return row  
        } catch(e) {
            if(isForeignKeyViolation(e)){
                throw new ConflictError('No se puede borrar: la ubicación tiene stock o movimientos asociados')
            }
            throw e
        }
        
    }
}