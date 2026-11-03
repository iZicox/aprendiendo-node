# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

# Guía completa: React + Hono en un único Cloudflare Worker

## 1. Crear el proyecto e instalar dependencias

```bash
npm create vite@latest sistema-inventario -- --template react-ts
cd sistema-inventario
npm install
npm install hono
npm install -D wrangler @cloudflare/vite-plugin
```

## 2. Aprobar los scripts de instalación (aviso `allow-scripts`)

```bash
npm approve-scripts esbuild workerd
npm rebuild esbuild workerd
```

`workerd` es el runtime donde corre tu Worker, y `esbuild` lo usa Vite.

## 3. `vite.config.ts`

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [react(), cloudflare()],
})
```

## 4. `wrangler.jsonc` (en la raíz, no dentro de `worker/`)

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "sistema-inventario",
  "main": "worker/index.ts",
  "compatibility_date": "2026-10-01",
  "assets": {
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"],
  },
  "observability": { "enabled": true },
}
```

- Si lo pones dentro de `worker/`, el `$schema` da error en VS Code y Wrangler no lo encuentra.
- `run_worker_first` evita que el fallback de SPA devuelva `index.html` en las rutas de la API.

## 5. `worker/index.ts`

```ts
import { Hono } from 'hono'

const api = new Hono()
  .basePath('/api')
  .get('/hello', (c) => c.json({ message: 'Hola desde Hono' }))

export default api
export type AppType = typeof api
```

Usa `basePath('/api')` y rutas con nombre (`/api/hello`). Una ruta `/api` a secas puede no coincidir con el patrón `/api/*`.

## 6. Tipos del runtime de Workers

```bash
npx wrangler types
```

Genera `worker-configuration.d.ts` en la raíz. Repite el comando cada vez que añadas bindings (D1, KV, R2).

## 7. Arreglar el conflicto de tipos DOM vs Workers

Crea `tsconfig.worker.json` en la raíz:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": [],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.worker.tsbuildinfo"
  },
  "include": ["worker", "worker-configuration.d.ts"]
}
```

Referéncialo en `tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.worker.json" }
  ]
}
```

Comprueba que `tsconfig.app.json` tenga solo `"include": ["src"]`. Después, en VS Code: `Ctrl+Shift+P` → **TypeScript: Restart TS Server**.

## 8. Llamar a la API desde React con tipos

```ts
// src/api.ts
import { hc } from 'hono/client'
import type { AppType } from '../worker'

export const client = hc<AppType>('/')
```

```tsx
// src/App.tsx
import { useEffect, useState } from 'react'
import { client } from './api'

export default function App() {
  const [msg, setMsg] = useState('')

  useEffect(() => {
    client.api.hello
      .$get()
      .then((r) => r.json())
      .then((d) => setMsg(d.message))
  }, [])

  return <h1>{msg}</h1>
}
```

## 9. Scripts en `package.json`

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "deploy": "wrangler d1 migrations apply inventario --remote && npm run build && wrangler deploy",
    "db:apply:remote": "wrangler d1 migrations apply inventario --remote",
    "db:seed:types:remote": "wrangler d1 execute inventario --remote --file=./seed-types.sql",
    "cf-typegen": "wrangler types"
  }
}
```

## 10. Probar en local

```bash
npm run dev
```

- `http://localhost:5173/` → tu React.
- `http://localhost:5173/api/hello` → `{"message":"Hola desde Hono"}`.

Vite corre en Node y tu código de `worker/` corre en `workerd`, el mismo runtime que usa Cloudflare en producción.

## 11. Desplegar a Cloudflare

La BD D1 `inventario` ya existe y su `database_id` está en `wrangler.jsonc`. El
Worker se llama `mi-app`, así que la URL final es
`https://mi-app.<subdominio>.workers.dev` (React en `/` y API en `/api/*`).

### 11.1. Primera vez (checklist)

```bash
npx wrangler login

# 1. Esquema en la BD de producción (5 migraciones)
npm run db:apply:remote

# 2. Tipos de movimiento mínimos — sin esto, registrar un movimiento falla
#    por clave foránea. No usa seed.sql para no meter productos de ejemplo.
npm run db:seed:types:remote

# 3. Secreto JWT. En el primer deploy NO vale `wrangler secret put` (el Worker
#    aún no existe): wrangler exige pasarlo con --secrets-file.
echo "JWT_SECRET=$(openssl rand -hex 32)" > .prod.vars   # .prod.vars está en .gitignore
npm run build
npx wrangler deploy --secrets-file .prod.vars
```

Si ejecutas `npm run deploy` sin el secreto, wrangler falla con
`The following required secrets have not been set: JWT_SECRET`.

> **Trampa:** `wrangler deploy` a secas usa el artefacto del último build
> (`dist/mi_app/wrangler.json`). Si el build es anterior a tocar `wrangler.jsonc`
> puede desplegarse apuntando a **otra base de datos**. Pasa siempre por
> `npm run build` antes, o usa `npm run deploy`.

### 11.2. Despliegues siguientes

```bash
npm run deploy   # aplica migraciones pendientes → compila → despliega
```

A partir del segundo deploy el secreto se hereda solo; no hace falta
`--secrets-file` de nuevo (para rotarlo: `npx wrangler secret put JWT_SECRET`).

### 11.3. Primer administrador y cierre de registro

El registro está **cerrado por defecto**: `POST /api/auth/register` responde
`403 Registro deshabilitado`. En local se abre con `ALLOW_REGISTRATION=true` en
`.dev.vars`. Para crear el primer admin en producción:

1. Abre el registro una vez: añade `"vars": { "ALLOW_REGISTRATION": "true" }`
   a `wrangler.jsonc` y `npm run deploy`.
2. Registra tu cuenta desde la web.
3. Promuévela a administrador:
   ```bash
   npx wrangler d1 execute inventario --remote \
     --command "UPDATE users SET role='admin' WHERE email='TU@CORREO.COM'"
   ```
4. Quita la variable y vuelve a desplegar (el registro queda cerrado).

Permisos de la API: lectura para cualquier usuario autenticado; crear, editar
y borrar **productos** y **sedes** solo `admin`; **movimientos** (entradas,
salidas y traspasos) los registra cualquier usuario; `/api/admin/stock/audit`
solo `admin`.

### 11.4. Verificación rápida tras desplegar

```bash
curl -i https://mi-app.<sub>/api/auth/me     # 401 + HSTS, X-Frame-Options, nosniff...
# registro cerrado:
curl -i -X POST https://mi-app.<sub>/api/auth/register \
  -H 'content-type: application/json' -d '{"email":"x@y.z","password":"password123"}'   # 403
```

## Tabla de errores y soluciones

| Problema                                                  | Causa                                 | Solución                                                 |
| --------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------- |
| Aviso `allow-scripts`                                     | npm bloquea scripts de instalación    | `npm approve-scripts esbuild workerd`                    |
| `Unable to load schema ... worker/node_modules/...`       | `wrangler.jsonc` dentro de `worker/`  | Moverlo a la raíz                                        |
| `Definitions of the following identifiers conflict` (DOM) | Tipos DOM y Workers mezclados         | `tsconfig.worker.json` sin `DOM` y referenciarlo         |
| `/api` devuelve el `index.html`                           | El fallback de SPA intercepta la ruta | `run_worker_first: ["/api/*"]` y rutas tipo `/api/hello` |
| `npm run build` falla en `tsc -b`                         | Errores de tipos entre proyectos      | Revisar los `include` de cada tsconfig                   |
| `The following required secrets have not been set`       | Primer deploy sin el secreto          | `npx wrangler deploy --secrets-file .prod.vars`          |
| `403 Registro deshabilitado` al registrarte              | El registro está cerrado en prod      | Abrirlo temporalmente con `ALLOW_REGISTRATION` (ver 11.3) |

Ya está conectada a **D1**. Los siguientes pasos naturales: tests + CI, dominio
propio en vez de `workers.dev` y un endpoint para que un admin cree usuarios.
