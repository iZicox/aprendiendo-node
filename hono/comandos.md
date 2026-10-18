## crear proyecto hono

```bash
npm create hono@latest .
```
- seleccionar cloudflare workers

## Crear D1 en local
Solo hay que descomentar la parte de la base de datos en D1 en wrangler.jsonc
Para cargar un script de la base de datos
```bash
npx wrangler d1 execute d1-local --local --file=./schema.sql
```

## Validaciones con Zod
Para validar los datos del body debemos instalar zod y otra libreria de hono
```bash
npm i zod @hono/zod-validator
```

Debemos crear unas funciones para validar los datos del body de la peticion 

```typescript
import { z } from "zod";

export const createProductSchema = z.object({
    name: z.string().min(3, 'Nombre obligatorio de 3 caracteres o mas'),
    price: z.number().positive('Precio mayor a 0'),
    stock: z.number().int('Numero entero').nonnegative('Numero mayor o igual a cero').optional().default(0)
})

export const updateProductSchema = z.object({
    name: z.string().min(3).optional(),
    price: z.number().positive().optional(),
    stock: z.number().int().optional()
})
```

## Crear un post

Para crear un post en hono es necesario usar un async await

```typescript
app.post('/api/products', async (c) => {
  const body = await c.req.json()

  return c.json(
    {
      ...body
    }
    , 201)

})
```

En el caso de usar validaciones con Zod esto genera unos middleware y ya no hace falta usar el async await

```typescript
import { createProductSchema, updateProductSchema } from './validations'
import { zValidator } from '@hono/zod-validator'

app.post('/api/products', zValidator('json', createProductSchema), (c) => {

  const data = c.req.valid('json')

  const newProduct = {
    id: Date.now(),
    ...data
  }

  db.products.push(newProduct)

  return c.json(
    {
      ...newProduct
    },
    201)

})
```