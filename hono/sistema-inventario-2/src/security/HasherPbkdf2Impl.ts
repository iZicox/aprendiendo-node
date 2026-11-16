import { Hasher } from "./Hasher"

// 8.000 iteraciones ≈ 3,4 ms por hash en el peor caso.
// Peor request (verificar + hashear) ≈ 7 ms. No subir sin medir.
const ITERACIONES = 8000
const MAX_ITERACIONES = 100000 // límite de Cloudflare
const MAX_LONGITUD = 1024 // evita gastar CPU con textos enormes

// Bytes -> texto hex. [255, 1] -> "ff01"
function aHex(bytes: Uint8Array): string {
  let texto = ""
  for (const b of bytes) {
    texto += b.toString(16).padStart(2, "0")
  }
  return texto
}

// Texto hex -> bytes. null si no es válido.
function desdeHex(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0) return null
  if (!/^[0-9a-f]+$/i.test(hex)) return null

  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

// Compara siempre todos los bytes para no filtrar info por el tiempo.
function sonIguales(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false

  let diferencia = 0
  for (let i = 0; i < a.length; i++) {
    diferencia = diferencia | (a[i] ^ b[i])
  }
  return diferencia === 0
}

// PBKDF2 nativo (rápido). Es la única parte que gasta CPU de verdad.
async function calcularHash(
  password: string,
  salt: Uint8Array,
  iteraciones: number,
) {
  const clave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  )

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: iteraciones, hash: "SHA-256" },
    clave,
    256, // 32 bytes
  )

  return new Uint8Array(bits)
}

export class Pbkdf2PasswordHasher implements Hasher {
  constructor() {}
  // Registro: devuelve "pbkdf2$sha256$iteraciones$salt$hash"
  async hash(password: string): Promise<string> {
    if (password.length > MAX_LONGITUD) {
      throw new Error("Contraseña demasiado larga")
    }

    const salt = crypto.getRandomValues(new Uint8Array(16))
    const hash = await calcularHash(password, salt, ITERACIONES)

    return `pbkdf2$sha256$${ITERACIONES}$${aHex(salt)}$${aHex(hash)}`
  }

  // Login: recalcula con el mismo salt y compara.
  // Las validaciones van ANTES del hash para no gastar CPU si algo falla.
  async compare(password: string, guardado: string): Promise<boolean> {
    const partes = guardado.split("$")
    if (partes.length !== 5) return false

    const [algoritmo, digest, iterTexto, saltHex, hashHex] = partes
    if (algoritmo !== "pbkdf2" || digest !== "sha256") return false

    const iteraciones = Number(iterTexto)
    if (!Number.isInteger(iteraciones)) return false
    if (iteraciones < 1 || iteraciones > MAX_ITERACIONES) return false

    const salt = desdeHex(saltHex)
    const esperado = desdeHex(hashHex)
    if (!salt || !esperado || esperado.length !== 32) return false
    if (password.length > MAX_LONGITUD) return false

    const calculado = await calcularHash(password, salt, iteraciones)
    return sonIguales(calculado, esperado)
  }
}
