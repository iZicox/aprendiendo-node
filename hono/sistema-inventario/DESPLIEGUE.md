# Despliegue en Cloudflare Workers

Guía paso a paso para crear la base de datos remota (D1), aplicar las
migraciones, configurar el secreto y desplegar la aplicación. Todos los
comandos se ejecutan desde la raíz del proyecto.

La app es un único worker: sirve el frontend (React, carpeta `src/`) y la API
(Hono, carpeta `worker/`) en el mismo dominio. Las rutas `/api/*` van al worker
y el resto a los archivos estáticos.

---

## 0. Requisitos

- Node.js y npm instalados.
- Dependencias instaladas: `npm install`.
- Una cuenta de Cloudflare con Workers y D1 disponibles.
- `openssl` (viene con Git for Windows) o Node para generar el secreto.

## 1. Iniciar sesión en Cloudflare

```bash
npx wrangler login
npx wrangler whoami
```

Comprueba que la cuenta mostrada es la correcta.

## 2. Crear la base de datos remota

```bash
npx wrangler d1 create inventario
```

La salida incluye un `database_id` con este formato:

```
4b7ea76c-5a9d-4521-b2a2-c23f81a22cd8
```

Si la base ya existe, no la vuelvas a crear. Para ver su ID:

```bash
npx wrangler d1 list
```

## 3. Poner el ID en `wrangler.jsonc`

Abre `wrangler.jsonc` y actualiza `database_id` dentro de `d1_databases`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "inventario",
    "database_id": "PEGA-AQUI-EL-ID",
    "migrations_dir": "migrations",
  },
],
```

El nombre del worker está en la línea `"name"` del mismo archivo
(`sistema-inventario`). Ese nombre define la URL:
`https://sistema-inventario.<tu-subdominio>.workers.dev`.

> **Importante:** si el `database_id` no existe en la cuenta que tienes
> autenticada, las migraciones fallan con el error `code: 7404`. Revisa que
> `npx wrangler d1 list` muestra esa base.

## 4. Aplicar las migraciones

```bash
npm run db:list:remote      # ver qué migraciones faltan
npm run db:apply:remote     # aplicarlas
npm run db:list:remote      # confirmar que todas aparecen con ✅
```

Hay 6 migraciones (`0000` a `0005`). La `0005` añade `users.token_version`,
necesaria para revocar los access tokens al cambiar la contraseña.

## 5. Cargar los tipos de movimiento

```bash
npm run db:seed:types:remote
```

Sin estos tipos no se pueden registrar movimientos ni traslados (fallan por
clave foránea). Este comando **no** carga productos ni ubicaciones de ejemplo.

Comprueba:

```bash
npx wrangler d1 execute inventario --remote --command "SELECT COUNT(*) AS tipos FROM movement_type"
```

Debe devolver `8`.

## 6. Generar el secreto `JWT_SECRET`

El secreto firma los access tokens. Debe tener al menos 32 caracteres; el
valor recomendado son 64 caracteres hexadecimales (256 bits).

Con Git Bash (o cualquier terminal con `openssl`):

```bash
openssl rand -hex 32
```

Sin `openssl`, con Node:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Reglas:

- Genera un valor **nuevo** para producción. No reutilices ejemplos ni valores
  de pruebas.
- No lo pegues en el repositorio, ni en el README, ni en ningún archivo que
  vayas a subir a git.
- Si lo cambias, todos los usuarios tendrán que volver a iniciar sesión.

## 7. Configurar el secreto en el primer despliegue

El worker todavía no existe en la primera subida, así que `wrangler secret put`
no funciona. En el primer despliegue hay que pasar el secreto con un archivo:

1. Crea un archivo temporal **fuera del repositorio** (por ejemplo en tu
   carpeta de usuario o en `%TEMP%`) con este contenido:

   ```
   JWT_SECRET=pega-aqui-el-valor-generado
   ```

2. Despliega usando ese archivo:

   ```bash
   npm run build
   npx wrangler deploy --secrets-file "C:/ruta/fuera/del/repo/prod-secrets.env"
   ```

3. Borra el archivo inmediatamente después:

   ```bash
   rm "C:/ruta/fuera/del/repo/prod-secrets.env"
   ```

A partir del segundo despliegue el secreto ya está guardado en Cloudflare y no
hace falta el archivo. Para rotarlo más adelante:

```bash
openssl rand -hex 32 | npx wrangler secret put JWT_SECRET
```

Comprueba que está configurado (solo muestra el nombre, no el valor):

```bash
npx wrangler secret list
```

## 8. Revisar la configuración de registro

En `wrangler.jsonc`, dentro de `vars`:

```jsonc
"vars": {
  "ALLOW_REGISTRATION": "true",
},
```

Con `"true"`, la pantalla `/registro` crea cuentas con rol `user`. Si quieres
cerrar el registro público, cambia el valor a `"false"` y vuelve a desplegar.

## 9. Desplegar

Para despliegues siguientes, el comando completo es:

```bash
npm run deploy
```

Este comando aplica las migraciones pendientes, compila el frontend y el worker
y despliega. Para el primer despliegue, usa los pasos 6 y 7 (con
`--secrets-file`) en lugar de `npm run deploy`.

Al terminar, Wrangler muestra la URL del worker y el ID de la versión
desplegada.

## 10. Comprobar el despliegue

Sustituye `U` por tu URL:

```bash
U="https://sistema-inventario.TU-SUBDOMINIO.workers.dev"

curl -s -o /dev/null -w "%{http_code}\n" $U/api/auth/me            # 401 (sin token)
curl -s -o /dev/null -w "%{http_code}\n" $U/api/products           # 401 (sin token)
curl -s -D - -o /dev/null $U/ | grep -iE "x-frame|content-security" # cabeceras de seguridad
```

Y en el navegador, abre la URL y comprueba que aparece la pantalla de login.

Revisa también los secretos y los bindings del despliegue:

```bash
npx wrangler secret list
```

## 11. Crear el primer administrador

Las cuentas nuevas se crean siempre con rol `user`. Para hacer administrador a
una cuenta, regístrate desde `/registro` y luego ejecuta:

```bash
npm run admin:promote -- tu@correo.com            # → admin (remoto)
npm run admin:promote -- tu@correo.com --user     # → vuelve a user
```

El cambio surte efecto en la siguiente petición de esa cuenta; no hace falta
cerrar sesión. Para la base local, añade `--local`.

## 12. Errores frecuentes

| Síntoma | Causa | Solución |
| --- | --- | --- |
| `code: 7404 The database ... could not be found` | El `database_id` no existe en la cuenta autenticada | Revisa `wrangler d1 list`, corrige `database_id` en `wrangler.jsonc` |
| `The following required secrets have not been set: JWT_SECRET` | Primer despliegue sin el secreto | Paso 7: `--secrets-file` |
| Login o cualquier ruta protegida responde `500 Error interno del servidor` | El secreto falta o tiene menos de 32 caracteres (el mensaje solo aparece en los logs de `wrangler tail` o del dashboard) | Revisa `npx wrangler secret list`; si hace falta, genera uno nuevo (paso 6) y vuelve a subirlo |
| Error `FOREIGN KEY constraint failed` al registrar movimientos | Faltan los tipos de movimiento | Paso 5 |
| `403 Registro deshabilitado` en `/api/auth/register` | `ALLOW_REGISTRATION` está en `false` | Paso 8 |
| La API responde `index.html` en lugar de JSON | Falta `run_worker_first: ["/api/*"]` en `wrangler.jsonc` | Revisa la sección `assets` |
| Los cambios de `wrangler.jsonc` no se reflejan | El `dist/` es de un build anterior | Ejecuta `npm run build` antes de `wrangler deploy` |

## Notas

- **Entorno local:** `.dev.vars` tiene el secreto y las variables para
  `wrangler dev`. Está en `.gitignore`. El despliegue no lo sube, pero no lo
  copies a ningún sitio de producción.
- **Archivos de `dist/`:** el build copia `.dev.vars` a
  `dist/sistema_inventario/`. Bórralo si aparece, por precaución.
- **Worker antiguo:** si existe un worker `mi-app` de pruebas, no se elimina
  solo. Para borrarlo: `npx wrangler delete --name mi-app`.
