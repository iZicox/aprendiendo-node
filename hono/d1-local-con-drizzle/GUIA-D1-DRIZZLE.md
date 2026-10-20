# Guía: proyecto D1 local con Drizzle y Hono

Guía paso a paso para crear un proyecto con **Cloudflare D1** (SQLite serverless), **Drizzle ORM** y **Hono**, trabajando primero en local y dejando preparado el camino a producción.

> **Idea central:** Drizzle genera las migraciones; Wrangler las aplica. Un solo dueño del ledger.

---

## Índice

1. [Qué cambia respecto a PostgreSQL](#1-qué-cambia-respecto-a-postgresql)
2. [Inicializar el proyecto](#2-inicializar-el-proyecto)
3. [Configurar Wrangler y crear la base](#3-configurar-wrangler-y-crear-la-base)
4. [El esquema declarativo](#4-el-esquema-declarativo)
5. [Configurar Drizzle Kit](#5-configurar-drizzle-kit)
6. [Generar la primera migración](#6-generar-la-primera-migración)
7. [Aplicar en local y verificar](#7-aplicar-en-local-y-verificar)
8. [El cliente Drizzle y las rutas](#8-el-cliente-drizzle-y-las-rutas)
9. [Levantar y probar](#9-levantar-y-probar)
10. [Seed: datos de prueba](#10-seed-datos-de-prueba)
11. [La prueba clave: recrear desde cero](#11-la-prueba-clave-recrear-desde-cero)
12. [Ejercicio: agregar y renombrar una columna](#12-ejercicio-agregar-y-renombrar-una-columna)
13. [Remoto: producción](#13-remoto-producción)
14. [Mapa de comandos](#14-mapa-de-comandos)
15. [Tropiezos frecuentes](#15-tropiezos-frecuentes)
16. [Mapa mental del proyecto](#16-mapa-mental-del-proyecto)

---

## 1. Qué cambia respecto a PostgreSQL

Una guía típica de Drizzle + PostgreSQL asume una conexión TCP y una `DATABASE_URL`. D1 rompe esos supuestos: el dialecto es SQLite y el acceso es por **binding** de Cloudflare.

| PostgreSQL | D1 |
|---|---|
| `pgTable`, `serial`, `varchar`, `numeric` | `sqliteTable`, `integer` PK, `text`, `integer` (centavos) |
| `DATABASE_URL` + driver `postgres` | binding `env.DB` (no existe URL) |
| `drizzle-kit migrate` | `wrangler d1 migrations apply --local/--remote` |
| `drizzle-kit push` | **no se usa** en este flujo |
| `migrate()` desde `postgres-js/migrator` | no aplica: el migrador es Wrangler |
| `dotenv` / `process.env` | `c.env` / `.dev.vars` |
| `node_compat` | no hace falta |

**La decisión de arquitectura:** D1 ya tiene su ledger (`d1_migrations`). Si además usás `drizzle-kit migrate`, se crea otro ledger (`__drizzle_migrations`) y terminás con dos historias que no coinciden. Elegí una: **Wrangler**.

---

## 2. Inicializar el proyecto

```bash
npm init -y
npm pkg set type=module

npm i hono drizzle-orm
npm i -D drizzle-kit wrangler typescript
```

`package.json` con scripts:

```json
{
  "name": "d1-local-con-drizzle",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "db:generate": "drizzle-kit generate",
    "db:apply:local": "wrangler d1 migrations apply d1-local-con-drizzle --local",
    "db:list:local": "wrangler d1 migrations list d1-local-con-drizzle --local",
    "db:seed:local": "wrangler d1 execute d1-local-con-drizzle --local --file=./seed.sql",
    "db:reset:local": "rm -rf .wrangler/state && npm run db:apply:local && npm run db:seed:local",
    "db:apply:remote": "wrangler d1 migrations apply d1-local-con-drizzle --remote"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  }
}
```

---

## 3. Configurar Wrangler y crear la base

`wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "d1-local-con-drizzle",
  "main": "src/index.ts",
  "compatibility_date": "2026-10-01",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "d1-local-con-drizzle",
      "database_id": "00000000-0000-0000-0000-000000000000",
      "migrations_dir": "drizzle"
    }
  ]
}
```

- `binding: "DB"` es lo que vas a ver como `c.env.DB`.
- `migrations_dir: "drizzle"` le dice a Wrangler que lea los `.sql` que genera Drizzle.
- Si solo vas a trabajar en local, el UUID de relleno alcanza. Para remoto necesitás el real:

```bash
npx wrangler login
npx wrangler d1 create d1-local-con-drizzle
```

Copiá el `database_id` que imprime y reemplazalo en el config.

> **Trampa:** no pongas `migrations_dir: "drizzle/migrations"` si tu `out` es `./drizzle`. Tiene que coincidir exactamente con la carpeta donde quedan los `.sql`.

---

## 4. El esquema declarativo

`src/db/schema.ts`:

```ts
import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  priceCents: integer('price_cents').notNull(),
  stock: integer('stock').notNull().default(0),
  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});
```

Decisiones que conviene entender:

- `serial` no existe en SQLite: se usa `integer` + `primaryKey({ autoIncrement: true })`.
- `varchar` no existe: es `text` (SQLite no impone longitud).
- `numeric(10,2)` no existe: guardá **centavos en un `integer`** y formateá en la aplicación. Evitás errores de punto flotante.
- `mode: 'timestamp'` guarda segundos Unix y te devuelve `Date`. El default `unixepoch()` lo pone la base, no el cliente.
- `.references()` genera la FK. D1 las hace cumplir.

---

## 5. Configurar Drizzle Kit

`drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
  verbose: true,
  strict: true,
});
```

No hay `dbCredentials`: `generate` es offline, solo compara el esquema con el snapshot. Las credenciales `d1-http` solo hacen falta si algún día usás Drizzle Studio o `push`/`migrate` contra remoto (que en este flujo no vamos a usar).

---

## 6. Generar la primera migración

```bash
npx drizzle-kit generate --name init
```

Queda:

```
drizzle/
├── 0000_init.sql
└── meta/
    ├── _journal.json
    └── 0000_snapshot.json
```

Abrí `0000_init.sql`. Se va a parecer a esto:

```sql
CREATE TABLE `categories` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);
--> statement-breakpoint
CREATE TABLE `products` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `price_cents` integer NOT NULL,
  `stock` integer DEFAULT 0 NOT NULL,
  `category_id` integer NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
);
```

**Checkpoint:** `--> statement-breakpoint` es un comentario SQL que usa Drizzle para separar statements. Wrangler lo ignora y ejecuta el archivo completo. El `meta/` es la memoria del diff: **se commitea siempre**; si lo perdés, el generador deja de saber qué cambió.

---

## 7. Aplicar en local y verificar

```bash
npm run db:apply:local
npm run db:list:local
```

Inspeccioná lo que quedó:

```bash
npx wrangler d1 execute d1-local-con-drizzle --local \
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

npx wrangler d1 execute d1-local-con-drizzle --local \
  --command "SELECT * FROM d1_migrations;"
```

Deberías ver `categories`, `products` y **`d1_migrations`**. Esa última es el ledger de Wrangler: la prueba de que las migraciones se aplicaron. No la edites a mano.

---

## 8. El cliente Drizzle y las rutas

`src/db/client.ts`:

```ts
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
```

`src/index.ts`:

```ts
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from './db/client';
import { categories, products } from './db/schema';

type Bindings = { DB: D1Database };

const app = new Hono<{ Bindings: Bindings }>();

app.get('/categories', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db.select().from(categories);
  return c.json(rows);
});

app.post('/categories', async (c) => {
  const db = getDb(c.env.DB);
  const { name } = await c.req.json<{ name: string }>();
  const [row] = await db.insert(categories).values({ name }).returning();
  return c.json(row, 201);
});

app.get('/products', async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      priceCents: products.priceCents,
      stock: products.stock,
      category: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id));
  return c.json(rows);
});

app.post('/products', async (c) => {
  const db = getDb(c.env.DB);
  const body = await c.req.json<{
    name: string;
    priceCents: number;
    stock?: number;
    categoryId: number;
  }>();
  const [row] = await db
    .insert(products)
    .values({
      name: body.name,
      priceCents: body.priceCents,
      stock: body.stock ?? 0,
      categoryId: body.categoryId,
    })
    .returning();
  return c.json(row, 201);
});

export default app;
```

**Detalle importante:** el cliente se crea **por request** (`getDb(c.env.DB)`), no en el top-level del módulo. En Workers, `env` no existe hasta que llega la request.

Generá los tipos de Cloudflare:

```bash
npx wrangler types
```

Eso crea `worker-configuration.d.ts` con `D1Database` y compañía. No necesitás `@cloudflare/workers-types` aparte.

---

## 9. Levantar y probar

```bash
npm run dev
```

En otra terminal:

```bash
curl http://localhost:8787/categories

curl -X POST http://localhost:8787/categories \
  -H 'content-type: application/json' \
  -d '{"name":"Electrónica"}'

curl -X POST http://localhost:8787/products \
  -H 'content-type: application/json' \
  -d '{"name":"Teclado","priceCents":4999,"stock":10,"categoryId":1}'

curl http://localhost:8787/products
```

La base local es un SQLite real dentro de `.wrangler/state/v3/d1/`. Persiste entre reinicios: no se resetea sola.

---

## 10. Seed: datos de prueba

`seed.sql`:

```sql
INSERT INTO categories (id, name) VALUES
  (1, 'Electrónica'),
  (2, 'Libros')
ON CONFLICT(id) DO NOTHING;

INSERT INTO products (id, name, price_cents, stock, category_id) VALUES
  (1, 'Teclado', 4999, 10, 1),
  (2, 'Novela', 1999, 5, 2)
ON CONFLICT(id) DO NOTHING;
```

```bash
npm run db:seed:local
```

Los seeds **no van en migraciones** y no deberían viajar a producción (salvo datos de referencia: países, roles, categorías fijas). Si los corrés dos veces, el `ON CONFLICT` evita duplicados.

---

## 11. La prueba clave: recrear desde cero

Pará `wrangler dev` y ejecutá:

```bash
npm run db:reset:local
npm run dev
```

Eso borra `.wrangler/state` (toda la base local), reaplica las migraciones en orden y vuelve a sembrar. Si la app funciona igual, tu historia es reproducible. **Este es el test que separa un proyecto sano de uno con drift.**

> Ojo: `rm -rf .wrangler/state` borra también KV/R2 locales del proyecto. En un proyecto de aprendizaje es exactamente lo que querés.

---

## 12. Ejercicio: agregar y renombrar una columna

**Agregar.** En `products`, sumá:

```ts
description: text('description'),
```

```bash
npx drizzle-kit generate --name add_description
npm run db:apply:local
```

Es nullable, así que no rompe las filas existentes.

**Renombrar.** Ahora cambiá `description` por `details` en el esquema y generá:

```bash
npx drizzle-kit generate --name rename_description
```

Muy probablemente el SQL diga `DROP COLUMN description` + `ADD COLUMN details`. Eso **pierde los datos**. Editalo antes de aplicar:

```sql
ALTER TABLE `products` RENAME COLUMN `description` TO `details`;
```

```bash
npm run db:apply:local
npx wrangler d1 execute d1-local-con-drizzle --local \
  --command "PRAGMA table_info(products);"
```

Ese es el corazón de la lección: **Drizzle propone, vos decidís**. El snapshot ya quedó con `details`, así que el próximo `generate` es consistente.

---

## 13. Remoto: producción

```bash
# Backup antes de cambios destructivos
npx wrangler d1 export d1-local-con-drizzle --remote --output=backup.sql

# Aplicar migraciones pendientes en la base remota
npm run db:apply:remote

# Deploy del Worker
npm run deploy
```

Recordá:

- Local y remoto tienen **ledgers distintos**. Aplicar `--local` no toca remoto.
- Para cambios aditivos: migración → deploy. Para destructivos: código que deja de usar la columna → migración. Es expand/contract.
- El archivo `.sql` es el mismo; el entorno cambia.

---

## 14. Mapa de comandos

| Objetivo | Comando |
|---|---|
| Generar migración | `npx drizzle-kit generate --name X` |
| Ver pendientes (local) | `npm run db:list:local` |
| Aplicar (local) | `npm run db:apply:local` |
| Ejecutar SQL (local) | `npx wrangler d1 execute <db> --local --command "..."` |
| Recrear local | `npm run db:reset:local` |
| Aplicar (remoto) | `npm run db:apply:remote` |
| Backup remoto | `npx wrangler d1 export <db> --remote --output=backup.sql` |
| Deploy | `npm run deploy` |

---

## 15. Tropiezos frecuentes

1. **Correr `drizzle-kit migrate` o `push`.** En este flujo, no. Wrangler es el único dueño del ledger.
2. **`migrations_dir` mal apuntado.** Si Drizzle escribe en `drizzle/`, Wrangler debe leer `drizzle/`. Si tu versión genera subcarpetas (`0001_init/migration.sql`), agregá `migrations_pattern`.
3. **Olvidar el `meta/`.** Sin snapshots, el diff miente. Commiteá la carpeta `drizzle/` completa.
4. **Editar una migración ya aplicada.** El ledger dice "aplicada" y nunca se vuelve a correr. Escribí una nueva.
5. **`PRAGMA foreign_keys=OFF` generado por un rebuild.** D1 puede rechazarlo; usá `PRAGMA defer_foreign_keys = true;` o reestructurá la migración.
6. **`no such table` en `wrangler dev`.** Aplicaste migraciones en otro estado local (otro `--persist-to`) o no aplicaste. Corré `--local` y reiniciá el dev server.
7. **Borrar `.wrangler/state` con el dev server corriendo.** Paralo primero.

---

## 16. Mapa mental del proyecto

```
src/db/schema.ts   →  la intención (qué querés)
drizzle/*.sql      →  la historia (cómo llegaste)
drizzle/meta/*     →  la memoria para calcular el diff
wrangler.jsonc     →  el binding y la carpeta de migraciones
.wrangler/state    →  la base local (descartable)
d1_migrations      →  el ledger (qué se aplicó de verdad)
```

Ese es el proyecto completo: esquema declarativo, migraciones generadas, un solo migrador, local reproducible y remoto con su propia historia.
