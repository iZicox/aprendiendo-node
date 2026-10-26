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
    "deploy": "npm run build && wrangler deploy",
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

```bash
npx wrangler login
npm run deploy
```

Te devuelve una URL `https://sistema-inventario.<subdominio>.workers.dev`, con React en `/` y la API en `/api/*`.

## Tabla de errores y soluciones

| Problema                                                  | Causa                                 | Solución                                                 |
| --------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------- |
| Aviso `allow-scripts`                                     | npm bloquea scripts de instalación    | `npm approve-scripts esbuild workerd`                    |
| `Unable to load schema ... worker/node_modules/...`       | `wrangler.jsonc` dentro de `worker/`  | Moverlo a la raíz                                        |
| `Definitions of the following identifiers conflict` (DOM) | Tipos DOM y Workers mezclados         | `tsconfig.worker.json` sin `DOM` y referenciarlo         |
| `/api` devuelve el `index.html`                           | El fallback de SPA intercepta la ruta | `run_worker_first: ["/api/*"]` y rutas tipo `/api/hello` |
| `npm run build` falla en `tsc -b`                         | Errores de tipos entre proyectos      | Revisar los `include` de cada tsconfig                   |

Cuando quieras, el siguiente paso natural para un inventario es añadir **D1**, la base de datos SQLite de Cloudflare. Te preparo esa configuración si quieres.
