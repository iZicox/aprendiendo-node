import { DrizzleD1Database } from "drizzle-orm/d1";
import { refreshTokens } from "../db/schema";
import { eq } from "drizzle-orm";
import { Session } from "../lib/types";

export class RefreshTokensRepository {
    private db: DrizzleD1Database
    constructor(db: DrizzleD1Database) {
        this.db = db
    }

    async create(session: Session) {
        const [row] = await this.db
            .insert(refreshTokens)
            .values(session)
            .returning({
                token: refreshTokens.token,
                userId: refreshTokens.userId,
                expiresAt: refreshTokens.expiresAt
            })
        return row
    }

    async findByToken(token: string) {
        const [row] = await this.db
            .select()
            .from(refreshTokens)
            .where(eq(refreshTokens.token, token))
        return row
    }

    async deleteByToken(token: string) {
        await this.db
            .delete(refreshTokens)
            .where(eq(refreshTokens.token, token))
    }
}