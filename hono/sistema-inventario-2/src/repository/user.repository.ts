import { DrizzleD1Database } from "drizzle-orm/d1"
import { users } from "../db/schema"
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
      .returning({ ...fields })

    return user ?? null
  }

  async updateRole(userId: number, role: "admin" | "user") {
    await this.db
      .update(users)
      .set({ role: role })
      .where(eq(users.id, userId))
      .returning()
  }
}
