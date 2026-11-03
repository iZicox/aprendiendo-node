import type { PasswordHasher } from "./password-hasher";

/**
 * Hash de contraseñas con PBKDF2-SHA256 via `crypto.subtle` (BoringSSL nativo).
 *
 * Por qué no bcrypt: `bcryptjs` es JavaScript puro y un hash cost-10 tarda
 * ~50-150 ms de CPU, mientras que el plan Workers Free solo permite 10 ms por
 * request (Error 1102). PBKDF2 nativo es un orden de magnitud más rápido.
 *
 * Formato auto-descriptivo: `pbkdf2$sha256$<iteraciones>$<saltHex>$<hashHex>`
 * Las iteraciones viajan dentro del propio hash, así que en el futuro se puede
 * subir el costo (o cambiar de algoritmo) sin migrar los hashes existentes:
 * `verify()` lee el costo de cada hash guardado.
 *
 * Ojo: workerd rechaza en producción más de 100.000 iteraciones
 * (cloudflare/workerd#1346) con NotSupportedError, y esa corrida sí consume
 * presupuesto de CPU. Por eso el máximo por defecto es 100.000 y nunca más.
 *
 * Nota de tipos: este archivo se compila también desde `tsconfig.app.json`
 * (arrastrado por `worker-configuration.d.ts`), que usa `lib: DOM`. Ahí
 * `SubtleCrypto` no expone `timingSafeEqual` (no es estándar) y `BufferSource`
 * es `ArrayBufferView<ArrayBuffer>`, de modo que se usa una comparación
 * constante portable en vez de la extensión de Cloudflare.
 */
const ALGORITHM = "pbkdf2";
// "sha256" es cómo se guarda en el hash; "SHA-256" es el nombre exacto que
// exige WebCrypto en deriveBits (acepta solo mayúsculas con guion, si no lanza
// "Unrecognized or unimplemented digest algorithm requested").
const DIGEST = "sha256";
const WEBCRYPTO_DIGEST = "SHA-256";
const SALT_BYTES = 16;
const HASH_BYTES = 32;

// Tope duro de la plataforma (workerd#1346). No subir: lo rechaza en prod.
const MAX_ITERATIONS = 100_000;

// Presupuesto del plan Workers Free: 10 ms de CPU por request. PBKDF2 corre en
// BoringSSL dentro del aislamiento, así que sí consume ese presupuesto
// (workerd#1346 limita las iteraciones justo por eso, porque no se puede
// interrumpir a mitad de corrida).
//
// Cálculo del peor caso = 2 derivaciones en una misma request (cambio de
// contraseña: verificar + hashear; y el primer login con email inexistente
// de un aislante recién arrancado, que además calcula el hash dummy).
//
// Coste medido por 100k iteraciones:
//   - benchmark local (Node/OpenSSL):  ~40 ms  -> 8k ≈ 3,2 ms/hash
//   - producción (reportado en #1346): ~42 ms  -> 8k ≈ 3,4 ms/hash
//   - preview remoto de CF:            ~15 ms  -> 8k ≈ 1,2 ms/hash
//
// Con el peor de los casos (42 ms/100k): 8k = 3,4 ms x 2 = 6,7 ms, más
// ~0,5 ms de JWT/JSON → ~7,2 ms. 10k habría sido 8,9 ms (84% del presupuesto,
// demasiado justo). 8k deja holgura bajo cualquier medición.
//
// Es un tradeoff deliberado: por debajo de la guía OWASP (600k), pero es lo
// que cabe con margen en el plan gratis. El formato guarda las iteraciones
// dentro del hash, así que más adelante se puede subir (plan de pago, u
// OWASP más alto) sin migrar: verify() lee el costo de cada hash guardado y
// re-hashea en el próximo cambio de contraseña.
const DEFAULT_ITERATIONS = 8_000;

// PBKDF2 no trunca como bcrypt (que cortaba a 72 bytes), así que acotamos la
// longitud ourselves para descartar entradas absurdas o de DoS.
const MAX_PASSWORD_BYTES = 1024;

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
    return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
    if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
        return null;
    }

    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
        out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
}

/**
 * Compara dos buffers en tiempo constante (XOR acumulado, sin salir antes de
 * recorrer todo). Se evita `crypto.subtle.timingSafeEqual` porque es una
 * extensión de Cloudflare ausente en `lib: DOM`, y este archivo se compila en
 * ambos proyectos.
 *
 * Precondición: ambos buffers miden HASH_BYTES (se valida antes de llamar), así
 * que la comprobación de longitud nunca falla en la práctica y no hay fuga.
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a[i]! ^ b[i]!;
    }
    return diff === 0;
}

export class Pbkdf2PasswordHasher implements PasswordHasher {
    private readonly iterations: number;

    constructor(iterations: number = DEFAULT_ITERATIONS) {
        if (
            !Number.isInteger(iterations) ||
            iterations < 1 ||
            iterations > MAX_ITERATIONS
        ) {
            throw new Error(
                `PBKDF2: iteraciones debe estar entre 1 y ${MAX_ITERATIONS}`,
            );
        }
        this.iterations = iterations;
    }

    async hash(password: string): Promise<string> {
        const passwordBytes = encoder.encode(password);
        if (passwordBytes.byteLength > MAX_PASSWORD_BYTES) {
            throw new Error(
                `La contraseña no puede superar ${MAX_PASSWORD_BYTES} bytes en UTF-8`,
            );
        }

        const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
        const derived = await this.derive(password, salt, this.iterations);

        return [
            ALGORITHM,
            DIGEST,
            this.iterations,
            toHex(salt),
            toHex(derived),
        ].join("$");
    }

    async verify(password: string, storedHash: string): Promise<boolean> {
        const parts = storedHash.split("$");

        // Formato desconocido (p. ej. un hash bcrypt legado) o corrupto: no
        // es esta contraseña, sin lanzar y sin distinguir el motivo.
        if (
            parts.length !== 5 ||
            parts[0] !== ALGORITHM ||
            parts[1] !== DIGEST
        ) {
            return false;
        }

        const iterations = Number(parts[2]);
        if (
            !Number.isInteger(iterations) ||
            iterations < 1 ||
            iterations > MAX_ITERATIONS
        ) {
            return false;
        }

        const salt = fromHex(parts[3]);
        const expected = fromHex(parts[4]);

        if (
            !salt ||
            !expected ||
            expected.byteLength !== HASH_BYTES ||
            encoder.encode(password).byteLength > MAX_PASSWORD_BYTES
        ) {
            return false;
        }

        const actual = await this.derive(password, salt, iterations);

        return constantTimeEqual(actual, expected);
    }

    private async derive(
        password: string,
        salt: Uint8Array<ArrayBuffer>,
        iterations: number,
    ): Promise<Uint8Array<ArrayBuffer>> {
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits"],
        );

        const bits = await crypto.subtle.deriveBits(
            { name: "PBKDF2", salt, iterations, hash: WEBCRYPTO_DIGEST },
            key,
            HASH_BYTES * 8,
        );

        return new Uint8Array(bits);
    }
}
