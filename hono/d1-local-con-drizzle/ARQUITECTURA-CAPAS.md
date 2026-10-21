# Arquitectura por capas

Guía aplicada al proyecto **`d1-local-con-drizzle`** (Hono + Drizzle + D1).

El objetivo no es aplicar arquitectura empresarial para un CRUD chico, sino separar tres responsabilidades que hoy están mezcladas en las rutas:

1. **HTTP:** leer la request, validar, responder con un status.
2. **Reglas de negocio:** decidir qué se puede hacer y qué no.
3. **Acceso a datos:** consultar e insertar en D1 con Drizzle.

---

## 1. Estructura actual

```text
src/
├── db/
│   ├── client.ts
│   └── schema.ts
├── routes/
│   ├── routes.categories.ts
│   └── routes.products.ts
├── validators.ts
├── types.ts
└── index.ts
```

Hoy las rutas hacen todo: validan, consultan la base, aplican reglas y responden.

Ejemplo real de `routes.categories.ts`:

```ts
routeCategory.delete('/categories/:id', zValidator('param', idSchema), async (c) => {
  const { id } = c.req.valid('param')
  const db = getDb(c.env.DB)

  const [productsExist] = await db
    .select()
    .from(products)
    .where(eq(products.categoryId, id))
    .limit(1)

  if (productsExist) {
    return c.json({ error: 'no se puede eliminar...' }, 409)
  }

  const [deleteCategory] = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning({ id: categories.id })

  if (!deleteCategory) {
    return c.json({ error: 'categoria no existe' }, 404)
  }

  return c.body(null, 204)
})
```

Ahí conviven HTTP, SQL y una regla de negocio. La idea es separar cada cosa.

---

## 2. Estructura propuesta

```text
src/
├── db/
│   ├── client.ts          ← conexión a D1
│   └── schema.ts          ← tablas, columnas, FKs, relations()
├── repositories/
│   ├── products.repository.ts
│   └── categories.repository.ts
├── services/
│   ├── products.service.ts     ← cuando haga falta
│   └── categories.service.ts   ← reglas de negocio
├── routes/
│   ├── routes.products.ts
│   └── routes.categories.ts
├── errors.ts              ← errores de negocio
├── validators.ts          ← schemas Zod
├── types.ts
└── index.ts               ← composición: CORS, montaje, onError
```

La capa `services/` es **opcional**. No hace falta crear un service por cada tabla ni un service que solo reenvíe llamadas al repository.

---

## 3. Flujo de una request

```text
Cliente HTTP
     │
     ▼
src/index.ts
CORS, montaje de routers, manejo global de errores
     │
     ▼
routes/*.ts
Valida con Zod, llama al service o al repository, responde
     │
     ▼
services/*.ts (si hay reglas de negocio)
Orquesta repositories, decide qué hacer, lanza errores de dominio
     │
     ▼
repositories/*.ts
Ejecuta Drizzle: select, insert, update, delete, joins
     │
     ▼
db/schema.ts + D1
Estructura e integridad: FKs, UNIQUE, NOT NULL
```

Para un CRUD sin reglas, el flujo puede ser más corto:

```text
Route → Repository → D1
```

No es obligatorio pasar por un service vacío.

---

## 4. Responsabilidades de cada capa

| Capa | Archivo | Se encarga de | No se encarga de |
|---|---|---|---|
| Entrada | `src/index.ts` | Crear la app, CORS, montar routers, `onError` | Consultas, reglas de negocio |
| HTTP | `routes/*.ts` | Leer `c.req`, validar con Zod, elegir status, devolver JSON | SQL, reglas complejas |
| Negocio | `services/*.ts` | Reglas, coordinación de repositories, errores de dominio | `c.json`, `c.req`, SQL directo |
| Datos | `repositories/*.ts` | Consultas Drizzle, joins, inserts, updates, deletes | HTTP, Zod, status codes |
| Estructura | `db/schema.ts` | Tablas, columnas, tipos, FKs, `relations()` | Consultas de la aplicación |
| Conexión | `db/client.ts` | Crear el cliente Drizzle para D1 | Consultas concretas |
| Validación | `validators.ts` | Forma y tipos de entrada | Reglas que necesitan la base |
| Migraciones | `drizzle/*.sql` | Historial de cambios de estructura | Consultas en runtime |

---

## 5. Los tres niveles de validación

Es importante no duplicar lo mismo en todas las capas.

### Zod / Route

Valida **forma y tipos**:

- ¿Viene `name`?
- ¿`priceCents` es un número entero positivo?
- ¿`categoryId` es un entero?
- ¿El body tiene el formato correcto?

### Service

Valida **reglas que necesitan estado de la base**:

- ¿Existe la categoría?
- ¿La categoría tiene productos?
- ¿Hay stock suficiente?
- ¿El usuario puede realizar esta acción?

### Base de datos

Es la **última red de seguridad**:

- FK: no existe un producto apuntando a una categoría inexistente.
- UNIQUE: no hay dos categorías con el mismo nombre.
- NOT NULL: no falta un campo obligatorio.

Las tres capas se complementan. La base no reemplaza al service; el service no reemplaza a Zod.

---

## 6. Errores de dominio

Crear `src/errors.ts`:

```ts
export class NotFoundError extends Error {
  constructor(message = 'No encontrado') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  constructor(message = 'Conflicto') {
    super(message)
    this.name = 'ConflictError'
  }
}
```

Los repositories y services no saben qué status HTTP corresponde. Solo lanzan el error de negocio.

En `src/index.ts` se traduce a HTTP:

```ts
import { NotFoundError, ConflictError } from './errors'

app.onError((error, c) => {
  if (error instanceof NotFoundError) {
    return c.json({ error: error.message }, 404)
  }

  if (error instanceof ConflictError) {
    return c.json({ error: error.message }, 409)
  }

  if (error instanceof HTTPException) {
    return error.getResponse()
  }

  console.error(error)
  return c.json({ error: 'error del servidor' }, 500)
})
```

Ventaja: las rutas quedan sin `try/catch` repetidos y el status se decide en un solo lugar.

---

## 7. Ejemplo completo: eliminar una categoría

### 7.1 Repository

```ts
// src/repositories/categories.repository.ts
import { eq } from 'drizzle-orm'
import type { InferInsertModel } from 'drizzle-orm'
import type { getDb } from '../db/client'
import { categories, products } from '../db/schema'

type DB = ReturnType<typeof getDb>

export type NewCategory = InferInsertModel<typeof categories>
export type CategoryUpdate = Partial<Omit<NewCategory, 'id'>>

export function listCategories(db: DB) {
  return db.select().from(categories)
}

export async function findCategoryById(db: DB, id: number) {
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1)

  return category ?? null
}

export async function categoryHasProducts(db: DB, categoryId: number) {
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.categoryId, categoryId))
    .limit(1)

  return Boolean(row)
}

export async function insertCategory(db: DB, data: NewCategory) {
  const [category] = await db
    .insert(categories)
    .values(data)
    .returning()

  return category
}

export async function updateCategoryById(db: DB, id: number, data: CategoryUpdate) {
  const [category] = await db
    .update(categories)
    .set(data)
    .where(eq(categories.id, id))
    .returning()

  return category ?? null
}

export async function deleteCategoryById(db: DB, id: number) {
  const [deleted] = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning({ id: categories.id })

  return deleted ?? null
}
```

### 7.2 Service

```ts
// src/services/categories.service.ts
import type { getDb } from '../db/client'
import { ConflictError, NotFoundError } from '../errors'
import {
  categoryHasProducts,
  deleteCategoryById,
  findCategoryById,
} from '../repositories/categories.repository'

type DB = ReturnType<typeof getDb>

export async function getCategory(db: DB, id: number) {
  const category = await findCategoryById(db, id)

  if (!category) {
    throw new NotFoundError('La categoría no existe')
  }

  return category
}

export async function deleteCategory(db: DB, id: number) {
  if (await categoryHasProducts(db, id)) {
    throw new ConflictError(
      'No se puede eliminar la categoría porque tiene productos relacionados',
    )
  }

  const deleted = await deleteCategoryById(db, id)

  if (!deleted) {
    throw new NotFoundError('La categoría no existe')
  }

  return deleted
}
```

El service no conoce Hono. Recibe `db` y datos comunes, y devuelve datos o lanza errores.

### 7.3 Route

```ts
// src/routes/routes.categories.ts
import { Hono } from 'hono'
import type { Env } from '../types'
import { zValidator } from '@hono/zod-validator'
import { getDb } from '../db/client'
import { idSchema } from '../validators'
import { deleteCategory } from '../services/categories.service'

const routeCategory = new Hono<Env>()

routeCategory.delete(
  '/categories/:id',
  zValidator('param', idSchema),
  async (c) => {
    const { id } = c.req.valid('param')
    const db = getDb(c.env.DB)

    await deleteCategory(db, id)

    return c.body(null, 204)
  },
)
```

La ruta ya no tiene SQL ni la regla de negocio. Solo valida el ID, llama al service y responde.

Si el service lanza `ConflictError`, `app.onError` responde 409. Si lanza `NotFoundError`, responde 404.

---

## 8. Ejemplo de repository de productos

```ts
// src/repositories/products.repository.ts
import { eq } from 'drizzle-orm'
import type { InferInsertModel } from 'drizzle-orm'
import type { getDb } from '../db/client'
import { products } from '../db/schema'

type DB = ReturnType<typeof getDb>

export type NewProduct = InferInsertModel<typeof products>
export type ProductUpdate = Partial<Omit<NewProduct, 'id' | 'createdAt'>>

export function listProducts(db: DB) {
  return db.select().from(products)
}

export async function findProductById(db: DB, id: number) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1)

  return product ?? null
}

export async function insertProduct(db: DB, data: NewProduct) {
  const [product] = await db
    .insert(products)
    .values(data)
    .returning()

  return product
}

export async function updateProductById(db: DB, id: number, data: ProductUpdate) {
  const [product] = await db
    .update(products)
    .set(data)
    .where(eq(products.id, id))
    .returning()

  return product ?? null
}

export async function deleteProductById(db: DB, id: number) {
  const [deleted] = await db
    .delete(products)
    .where(eq(products.id, id))
    .returning({ id: products.id })

  return deleted ?? null
}
```

La ruta puede usar el repository directo para lecturas simples:

```ts
routeProduct.get('/products', async (c) => {
  const db = getDb(c.env.DB)
  return c.json(await listProducts(db))
})
```

Y un service para operaciones con reglas o traducción de errores:

```ts
// src/services/products.service.ts
import type { getDb } from '../db/client'
import { isDbConstraintError } from '../db/client'
import { ConflictError, NotFoundError } from '../errors'
import type { NewProduct, ProductUpdate } from '../repositories/products.repository'
import {
  insertProduct,
  updateProductById,
} from '../repositories/products.repository'

type DB = ReturnType<typeof getDb>

export async function createProduct(db: DB, data: NewProduct) {
  try {
    return await insertProduct(db, data)
  } catch (error) {
    if (isDbConstraintError(error, 'FOREIGN KEY constraint failed')) {
      throw new ConflictError('No existe una categoría con ese id')
    }
    throw error
  }
}

export async function updateProduct(db: DB, id: number, data: ProductUpdate) {
  try {
    const product = await updateProductById(db, id, data)

    if (!product) {
      throw new NotFoundError('El producto no existe')
    }

    return product
  } catch (error) {
    if (error instanceof NotFoundError) throw error

    if (isDbConstraintError(error, 'FOREIGN KEY constraint failed')) {
      throw new ConflictError('No existe una categoría con ese id')
    }

    throw error
  }
}
```

---

## 9. Reglas de dependencia

```text
routes → services → repositories → db/schema + D1
```

Reglas concretas:

- Un **repository** no importa Hono, ni `Context`, ni `c.json`.
- Un **service** no importa `Context` de Hono ni devuelve `Response`.
- Una **route** no arma consultas Drizzle.
- Un **validator** no consulta la base.
- El **schema** no importa rutas, services ni repositories.
- Las dependencias nunca van al revés.

> Tip: para no repetir `type DB = ReturnType<typeof getDb>` en cada archivo, podés exportarlo desde `src/db/client.ts`:
>
> ```ts
> export type DB = ReturnType<typeof getDb>
> ```
>
> Y en los repositories/services usar `import type { DB } from '../db/client'`.

Esto permite:

- Probar un repository contra una base local.
- Probar un service sin levantar HTTP.
- Cambiar una respuesta HTTP sin tocar SQL.
- Reutilizar una regla desde otro entrypoint (cron, queue, CLI).

---

## 10. ¿Cuándo crear un service?

Crealo cuando exista alguna de estas situaciones:

- Una regla cruza varias tablas o entidades.
- Hay que coordinar varios repositories.
- Hay que usar `db.batch()` o una operación atómica.
- La misma lógica se usa desde más de una ruta o entrypoint.
- Querés errores de negocio claros (`NotFoundError`, `ConflictError`).
- Hay permisos, auditoría o efectos secundarios.
- La ruta empieza a tener demasiados `if` y `try/catch`.

**No** lo crees si solo va a hacer esto:

```ts
// No aporta nada
export function listProductsService(db: DB) {
  return listProducts(db)
}
```

En ese caso, la ruta puede llamar al repository directamente.

---

## 11. ¿Cuándo NO hace falta repository?

Tampoco hay que exagerar. No crees un repository si:

- Tenés una única consulta de una línea usada una sola vez.
- No hay reutilización ni reglas.
- Lo único que hacés es copiar la firma de Drizzle.

La regla práctica:

> Extraé cuando la consulta se repite, cuando mezcla tablas, cuando la ruta se llena de SQL o cuando querés testearla por separado.

---

## 12. Transacciones y D1

D1 no funciona como Postgres con transacciones interactivas. Para operaciones atómicas se usa `db.batch()`.

Ejemplo conceptual: crear un pedido y descontar stock. Faltan los imports de `sql`, `eq`, las tablas y los tipos `NewOrder` / `NewOrderItem`.

```ts
export async function createOrder(db: DB, order: NewOrder, items: NewOrderItem[]) {
  const statements = [
    db.insert(orders).values(order),
    ...items.map((item) => db.insert(orderItems).values(item)),
    ...items.map((item) =>
      db
        .update(products)
        .set({ stock: sql`${products.stock} - ${item.quantity}` })
        .where(eq(products.id, item.productId)),
    ),
  ]

  return db.batch(statements)
}
```

La decisión de negocio (“se puede vender”, “hay stock”, “qué pasa si falla”) va en el service. El repository puede exponer la operación de batch.

---

## 13. `relations()` no es una capa

No confundir:

- **FK en `schema.ts`** → restricción real en la base, genera migración.
- **`relations()` en `schema.ts`** → metadata para el query builder de Drizzle, no genera migración.
- **Consulta en el repository** → lo que realmente se ejecuta.

Si querés respuestas anidadas:

```ts
const rows = await db.query.products.findMany({
  with: { category: true },
})
```

Eso requiere `relations()` declaradas y el `schema` pasado a `drizzle()` (tu `getDb` ya lo hace).

Pero para la API no es obligatorio: devolver `categoryId` es una representación normalizada y válida. Si agregás la categoría, devolvé un resumen (`id`, `name`), no todos sus campos.

---

## 14. Plan de migración desde el estado actual

No hace falta cambiar la base ni generar migraciones. Es un refactor de código.

1. Crear `src/errors.ts` con `NotFoundError` y `ConflictError`.
2. Crear `src/repositories/products.repository.ts` y mover las consultas de productos.
3. Crear `src/repositories/categories.repository.ts` y mover las consultas de categorías.
4. Mover la verificación `categoryHasProducts` al repository de categorías.
5. Crear `src/services/categories.service.ts` para la regla de borrado.
6. Crear `src/services/products.service.ts` solo para las operaciones que traducen errores de FK.
7. Adelgazar las rutas: Zod + llamada a service/repository + respuesta.
8. Agregar el mapeo de errores de dominio en `app.onError`.
9. Ejecutar `npx tsc --noEmit`.
10. Probar los endpoints con `test.http`.

Orden sugerido: primero mover consultas sin cambiar comportamiento, después agregar services. Así podés verificar que la API sigue igual entre paso y paso.

---

## 15. Checklist para agregar un endpoint

- [ ] ¿Definí el schema Zod de entrada?
- [ ] ¿La consulta va al repository de la tabla correspondiente?
- [ ] ¿Hay alguna regla de negocio que requiera un service?
- [ ] ¿La ruta solo hace HTTP (validar, llamar, responder)?
- [ ] ¿Los errores de negocio se traducen en `app.onError`?
- [ ] ¿El repository devuelve datos, no `Response`?
- [ ] ¿Evité duplicar validaciones en las tres capas?
- [ ] ¿Actualicé los tipos (`InferInsertModel`, `InferSelectModel`)?
- [ ] ¿Probé el caso feliz y los 400/404/409?

---

## 16. Errores comunes

### Repository genérico

Evitar:

```ts
findAll(table: any)
findById(table: any, id: number)
```

Se pierden tipos y reglas específicas. Mejor funciones explícitas por tabla.

### Service pasamanos

Un service que solo llama a un repository agrega indirección sin valor. Dejalo para cuando haya una regla real.

### Poner HTTP en el repository

Mal:

```ts
export function getProducts(c: Context) {
  return c.json(rows)
}
```

El repository no debe saber que existe HTTP.

### Devolver todos los campos de la relación

Si un producto incluye su categoría, no devuelvas el registro completo de categoría por defecto. Devolvé lo necesario (`id`, `name`) o dejá que el cliente consulte `/api/categories/:id`.

### Consultas N+1

Mal:

```ts
for (const product of products) {
  const category = await findCategoryById(db, product.categoryId)
}
```

Bien: un `join` o `db.query` con `with`.

### Confundir `relations()` con una FK

`relations()` no crea integridad referencial. La FK se declara en la columna con `.references()`.

---

## 17. Resumen

- **Route:** HTTP y validación de forma.
- **Service:** reglas de negocio y coordinación.
- **Repository:** Drizzle y acceso a datos.
- **Schema:** estructura e integridad.
- **D1:** persistencia real.

Para este proyecto:

1. Mové las consultas a `repositories/`.
2. Dejá las rutas finas.
3. Creá `categories.service.ts` para la regla de “no borrar categoría con productos”.
4. Creá services de productos solo cuando haya reglas que lo justifiquen.
5. No agregues capas vacías: la mejor arquitectura es la mínima que mantiene el código claro.
