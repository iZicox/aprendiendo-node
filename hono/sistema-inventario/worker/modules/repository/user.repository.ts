import { DrizzleD1Database } from "drizzle-orm/d1";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { CreateUserInput, UserRole } from "../../db/types";


// Campos que pueden devolverse sin exponer el hash.
const publicUserFields = {
  id: users.id,
  email: users.email,
  role: users.role,
  createdAt: users.createdAt,
};

export class UserRepository{
    private db: DrizzleD1Database

    constructor(db: DrizzleD1Database){
        this.db = db
    }

    // obtener incluyendo hash para el login
    async findByEmail(email: string){
        const [row] = await this.db
            .select({
                id: users.id,
                email: users.email,
                passwordHash: users.passwordHash,
                role: users.role,
            })
            .from(users)
            .where(eq(users.email, email))
            .limit(1)
        return row ?? null
    }

    // obtener por id con datos publicos sin hash
    async findById(id: number){
        const [row] = await this.db
            .select({
                ...publicUserFields,
            })
            .from(users)
            .where(eq(users.id, id))
        return row ?? null
    }

    // actualizar contraseña
    async updatePassword(id: number, newPassHash: string): Promise<boolean>{
        const [updated] = await this.db
            .update(users)
            .set({ passwordHash: newPassHash })
            .where(eq(users.id, id))
            .returning({id: users.id})

        return updated !== undefined
    }

    // actualizar rol
    async updateRol(id: number, newRol: UserRole){
        const [update] = await this.db
            .update(users)
            .set({role: newRol})
            .where(eq(users.id, id))
            .returning()
        return update !== undefined
    }

    // crear usuario
    async create(data: CreateUserInput){
        const [row] = await this.db
            .insert(users)
            .values({
                email: data.email,
                passwordHash: data.passwordHash,
                role: data.role ?? 'user'
            })
            .returning(publicUserFields)

        return row
    }

    async findCredentialsById(id: number) {
    const [row] = await this.db
        .select({
        id: users.id,
        passwordHash: users.passwordHash,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

    return row ?? null;
    }


}