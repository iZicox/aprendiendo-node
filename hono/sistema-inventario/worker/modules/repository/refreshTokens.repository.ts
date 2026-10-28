import { DrizzleD1Database } from "drizzle-orm/d1";
import { refreshTokens } from "../../db/schema";
import { and, eq, isNull, lt } from "drizzle-orm";

export class RefreshTokenRepository {
    private db: DrizzleD1Database
    constructor(db: DrizzleD1Database) {
        this.db = db
    }

    async create(data: {
        userId: number;
        tokenHash: string;
        familyId: string;
        expiresAt: Date;
    }) {
        await this.db.insert(refreshTokens).values(data);
    }

    async findByHash(tokenHash: string) {
        const [row] = await this.db
            .select()
            .from(refreshTokens)
            .where(eq(refreshTokens.tokenHash, tokenHash))
            .limit(1);
        return row ?? null;
    }

    /**
     * Revoca el token SOLO si sigue activo. Es atómico (un único UPDATE
     * condicional), así que si dos peticiones intentan usar el mismo token,
     * solo una "gana". Devuelve true si este llamador lo revocó.
     */
    async revokeIfActive(id: number): Promise<boolean> {
        const [row] = await this.db
            .update(refreshTokens)
            .set({ revokedAt: new Date() })
            .where(and(eq(refreshTokens.id, id), isNull(refreshTokens.revokedAt)))
            .returning({ id: refreshTokens.id });
        return row !== undefined;
    }

    // Revoca toda la cadena de rotación (detección de reutilización).
    async revokeFamily(familyId: string) {
        await this.db
            .update(refreshTokens)
            .set({ revokedAt: new Date() })
            .where(
                and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)),
            );
    }

    // Cierra todas las sesiones de un usuario.
    async revokeAllForUser(userId: number) {
        await this.db
            .update(refreshTokens)
            .set({ revokedAt: new Date() })
            .where(
                and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
            );
    }

    // Para un cron (scheduled handler) que limpie tokens caducados.
    async deleteExpired() {
        await this.db
            .delete(refreshTokens)
            .where(lt(refreshTokens.expiresAt, new Date()));
    }
}