import { DrizzleD1Database } from "drizzle-orm/d1"
import { users } from "../db/schema"
import { number, string } from "zod"
import { eq } from "drizzle-orm"
import { CreateUserInput } from "../lib/types"

const fields = {
  id: users.id,
  email: users.email,
  passwordHash: users.passwordHash,
  role: users.role,
}

export class UserRepository {
  private db: DrizzleD1Database
  constructor(db: DrizzleD1Database) {
    this.db = db
  }

  async findById(id: number) {
    const [user] = await this.db
      .select({ ...fields })
      .from(users)
      .where(eq(users.id, id))
    return user ?? null
  }

  async findByEmail(email: string) {
    const [user] = await this.db
      .select({ ...fields })
      .from(users)
      .where(eq(users.email, email))
    return user ?? null
  }

  async createUser(data: CreateUserInput) {
    const [user] = await this.db
      .insert(users)
      .values({
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role ?? "user",
      })
      .returning()

    return user ?? null
  }

  async updatePassword(newPasswordHash: string, userId: number) {
    const [update] = await this.db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id })
    return update !== undefined
  }

  async updateRole(newRol: "admin" | "user", userId: number) {
    const [update] = await this.db
      .update(users)
      .set({
        role: newRol,
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id })
    return update !== undefined
  }
}
