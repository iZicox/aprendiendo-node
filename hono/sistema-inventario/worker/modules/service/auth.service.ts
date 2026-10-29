import { sign, verify } from "hono/jwt";

import type { UserRole } from "../../db/types";
import {
    BadRequestError,
    ConflictError,
    NotFoundError,
    UnauthorizedError,
} from "../../lib/errors";
import type { PasswordHasher } from "../../security/password-hasher";
import type { RefreshTokenRepository } from "../repository/refreshTokens.repository";
import type { UserRepository } from "../repository/user.repository";

// ---------- Tipos ----------

export interface AuthConfig {
    jwtSecret: string;
    accessTtlSeconds?: number; // por defecto 15 min
    refreshTtlSeconds?: number; // por defecto 30 días
}

export interface AccessTokenPayload {
    sub: string; // id del usuario
    role: UserRole;
    iat: number;
    exp: number;
}

export interface Session {
    accessToken: string;
    refreshToken: string; // valor en claro: va a la cookie, nunca se guarda tal cual
    refreshExpiresAt: Date;
}

export const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- Utilidades ----------

function randomToken(bytes = 32): string {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

// El refresh token tiene 256 bits de entropía: basta SHA-256 (bcrypt sería innecesario y lento).
async function sha256Hex(value: string): Promise<string> {
    const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(value),
    );
    return [...new Uint8Array(digest)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

// ---------- Servicio ----------

export class AuthService {
    private readonly users: UserRepository;
    private readonly refreshTokens: RefreshTokenRepository;
    private readonly hasher: PasswordHasher;
    private readonly config: AuthConfig;
    private readonly accessTtl: number;
    private readonly refreshTtl: number;
    private dummyHash: Promise<string> | null = null;

    constructor(
        users: UserRepository,
        refreshTokens: RefreshTokenRepository,
        hasher: PasswordHasher,
        config: AuthConfig,
    ) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.hasher = hasher;
        this.config = config;
        this.accessTtl = config.accessTtlSeconds ?? ACCESS_TTL_SECONDS;
        this.refreshTtl = config.refreshTtlSeconds ?? REFRESH_TTL_SECONDS;
    }

    // --- Registro ---
    async register(email: string, password: string) {
        const normalized = normalizeEmail(email);
        if (!EMAIL_REGEX.test(normalized)) {
            throw new BadRequestError("El email no es válido");
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            throw new BadRequestError(
                `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
            );
        }

        const user = await this.users.findByEmail(normalized);

        if (user) {
            throw new ConflictError("Ese email ya está registrado");
        }

        const passwordHash = await this.hashPassword(password);

        try {
            return await this.users.create({ email: normalized, passwordHash });
        } catch (err) {
            // Carrera: dos registros simultáneos; el UNIQUE de la BD es la fuente de verdad.
            if (err instanceof Error && /UNIQUE/i.test(err.message)) {
                throw new ConflictError("Ese email ya está registrado");
            }
            throw err;
        }
    }

    // --- Login ---
    async login(email: string, password: string) {
        const user = await this.users.findByEmail(normalizeEmail(email));

        // Si el usuario no existe, comparamos contra un hash falso para que el
        // tiempo de respuesta no revele qué emails están registrados.
        const hashToCompare = user ? user.passwordHash : await this.getDummyHash();
        const valid = await this.hasher.verify(password, hashToCompare);

        if (!user || !valid) {
            throw new UnauthorizedError("Email o contraseña incorrectos");
        }

        const session = await this.issueSession(
            user.id,
            user.role,
            crypto.randomUUID(),
        );
        return {
            user: { id: user.id, email: user.email, role: user.role },
            ...session,
        };
    }

    // --- Refresh con rotación y detección de reutilización ---
    async refresh(rawRefreshToken: string): Promise<Session> {
        const tokenHash = await sha256Hex(rawRefreshToken);
        const stored = await this.refreshTokens.findByHash(tokenHash);

        if (!stored) {
            throw new UnauthorizedError("Sesión inválida o expirada");
        }

        // Token ya usado/revocado → posible robo: invalidamos toda la cadena.
        if (stored.revokedAt) {
            await this.refreshTokens.revokeFamily(stored.familyId);
            throw new UnauthorizedError("Sesión inválida o expirada");
        }

        if (stored.expiresAt.getTime() <= Date.now()) {
            throw new UnauthorizedError("Sesión inválida o expirada");
        }

        // Reclamo atómico: si otra petición lo gastó entre medias, tratamos como reutilización.
        const claimed = await this.refreshTokens.revokeIfActive(stored.id);
        if (!claimed) {
            await this.refreshTokens.revokeFamily(stored.familyId);
            throw new UnauthorizedError("Sesión inválida o expirada");
        }

        const user = await this.users.findById(stored.userId);
        if (!user) {
            throw new UnauthorizedError("Sesión inválida o expirada");
        }

        // Mismo familyId: la cadena de rotación continúa.
        return this.issueSession(user.id, user.role, stored.familyId);
    }

    // --- Logout (dispositivo actual). Idempotente: nunca falla por token desconocido. ---
    async logout(rawRefreshToken: string | undefined): Promise<void> {
        if (!rawRefreshToken) return;
        const stored = await this.refreshTokens.findByHash(
            await sha256Hex(rawRefreshToken),
        );
        if (stored) await this.refreshTokens.revokeFamily(stored.familyId);
    }

    // --- Logout en todos los dispositivos ---
    async logoutAll(userId: number): Promise<void> {
        await this.refreshTokens.revokeAllForUser(userId);
    }

    // --- Cambio de contraseña ---
    async changePassword(
        userId: number,
        currentPassword: string,
        newPassword: string,
    ): Promise<void> {
        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            throw new BadRequestError(
                `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
            );
        }

        const creds = await this.users.findCredentialsById(userId);
        if (!creds) throw new NotFoundError("Usuario no encontrado");

        const ok = await this.hasher.verify(currentPassword, creds.passwordHash);
        if (!ok) {
            throw new BadRequestError("La contraseña actual no es correcta");
        }

        const newHash = await this.hashPassword(newPassword);
        await this.users.updatePassword(userId, newHash);

        // Cerramos todas las sesiones existentes tras cambiar la contraseña.
        await this.refreshTokens.revokeAllForUser(userId);
    }

    // --- Perfil del usuario autenticado ---
    async getProfile(userId: number) {
        const user = await this.users.findById(userId);
        if (!user) throw new NotFoundError("Usuario no encontrado");
        return user;
    }

    // --- Verificación del access token (para el middleware) ---
    static async verifyAccessToken(
        token: string,
        jwtSecret: string,
    ): Promise<AccessTokenPayload> {
        if (!jwtSecret || jwtSecret.length < 32) {
            throw new Error("JWT_SECRET no configurado o demasiado corto");
        }

        try {
            return (await verify(
                token,
                jwtSecret,
                "HS256",
            )) as unknown as AccessTokenPayload;
        } catch {
            throw new UnauthorizedError("Token inválido o expirado");
        }
    }

    // ---------- Privados ----------

    private async issueSession(
        userId: number,
        role: UserRole,
        familyId: string,
    ): Promise<Session> {
        const now = Math.floor(Date.now() / 1000);

        const accessToken = await sign(
            { sub: String(userId), role, iat: now, exp: now + this.accessTtl },
            this.config.jwtSecret,
            "HS256",
        );

        const refreshToken = randomToken();
        const refreshExpiresAt = new Date((now + this.refreshTtl) * 1000);

        await this.refreshTokens.create({
            userId,
            tokenHash: await sha256Hex(refreshToken),
            familyId,
            expiresAt: refreshExpiresAt,
        });

        return { accessToken, refreshToken, refreshExpiresAt };
    }

    private async hashPassword(password: string): Promise<string> {
        try {
            return await this.hasher.hash(password);
        } catch (err) {
            throw new BadRequestError(
                err instanceof Error ? err.message : "Contraseña no válida",
            );
        }
    }

    private getDummyHash(): Promise<string> {
        this.dummyHash ??= this.hasher.hash(randomToken(16));
        return this.dummyHash;
    }
}
