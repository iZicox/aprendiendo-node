import { CreateUserInput, RegisterInput, UserRole } from "../../db/types";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../lib/errors";
import { PasswordHasher } from "../../security/password-hasher";
import { UserRepository } from "../repository/user.repository";



export class UserService{
    private repo: UserRepository
    private hasher: PasswordHasher

    constructor(repo: UserRepository, hasher: PasswordHasher){
        this.repo = repo
        this.hasher= hasher
    }

    private normalizeEmail(email: string){
        return email.trim().toLocaleLowerCase()
    }

    async register(input: RegisterInput){
        const email = this.normalizeEmail(input.email)
        if(!email.includes('@')) {
            throw new ConflictError('Email no valido')
        }
        if(!input.password || input.password.length < 8){
            throw new ConflictError('Contraseña muy corta, debe ser de al menos 8 caracteres')
        }

        const exist = await this.repo.findByEmail(email)
        if(exist){
            throw new ConflictError('El email ya existe')
        }

        const passwordHash = await this.hasher.hash(input.password)
        const data: CreateUserInput = { email, passwordHash, role: input.role }
        return this.repo.create(data)

    }

    async login(email: string, password: string){

        // verificar email
        const user = await this.repo.findByEmail(this.normalizeEmail(email))
        if(!user){
            throw new UnauthorizedError('Credenciales invalidas')
        }

        // verificar contraseña
        const ok = await this.hasher.verify(password, user.passwordHash)
        if(!ok){
            throw new UnauthorizedError('Credenciales invalidas')
        }

        return { id: user.id, email: user.email, role: user.role }
    }

    async getById(id: number){
        const user = await this.repo.findById(id)
        if(!user) throw new NotFoundError('Usuario no encontrado')
        return user
    }

    async passwordChange(id: number, currentPass: string, newPass: string){
        // verificar contraseña
        if(!newPass || newPass.length > 8){
            throw new ConflictError('Contraseña de al menos 8 caracteres')
        }

        // buscar hash de la contraseña en la base de datos
        const creds = await this.repo.findCredentialsById(id)
        if(!creds) throw new NotFoundError('Usuario no encontrado')

        // verificar la actual contraseña si coincide con al de la base de datos
        const ok = await this.hasher.verify(currentPass, creds.passwordHash)
        if(!ok){
            throw new ConflictError('Credenciales invalidas')
        }

        // generar el hash de la nueva contraseña
        const newHash = await this.hasher.hash(newPass)
        // guardar la nueva contraseña
        const update = await this.repo.updatePassword(id, newHash)
        if(!update) throw new NotFoundError('Usuario no encontrado')

        // devolver el usuario
        return this.repo.findById(id)

    }

    async roleChange(id: number, role: UserRole){
        const update = await this.repo.updateRol(id, role)
        if(!update) throw new NotFoundError('Usuario no encontrado')
        return this.repo.findById(id)
    }




}