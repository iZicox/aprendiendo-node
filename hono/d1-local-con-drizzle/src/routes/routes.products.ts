import { Hono } from "hono"
import { getDb, isDbConstraintError } from "../db/client"
import { products } from "../db/schema"
import { Env } from "../types"
import { zValidator } from "@hono/zod-validator"
import { createProductSchema, idSchema, updateProductScheme } from "../validators"
import { eq } from "drizzle-orm"

const routeProduct = new Hono<Env>()

// listar
routeProduct.get('/products', async (c) => {
  const db = getDb(c.env.DB)
  const rows = await db.select().from(products)
  return c.json(rows)
})

// listar por id
routeProduct.get('/products/:id', zValidator('param', idSchema), async (c) => {
  const { id } = c.req.valid('param')
  const db = getDb(c.env.DB)
  const [product] = await db.select().from(products).where(eq(products.id, id))

  if(!product){
    return c.json({error: 'producto no encontrado'}, 404)
  }

  return c.json(product)
})

// insertar
routeProduct.post('/products', zValidator('json', createProductSchema), async (c) => {
  const data = c.req.valid('json')
  const db = getDb(c.env.DB)

  try{
    const [row] = await db
      .insert(products)
      .values(data)
      .returning()

    c.header('Location', `/products/${row.id}`)
    return c.json(row, 201)
  }catch(error){
    if(isDbConstraintError(error, 'FOREIGN KEY constraint failed')){
        return c.json({ error: 'no existe una categoria con ese id' }, 409)
      }
      throw error
  }
  
})

// editar
routeProduct.patch(
  '/products/:id', 
  zValidator('param', idSchema), 
  zValidator('json', updateProductScheme), 
  async (c) => {
    const { id } = c.req.valid('param')
    const data = c.req.valid('json')

    if(Object.keys(data).length === 0){
      return c.json({error: 'no hay campos para actualizar'}, 400)
    }

    const db = getDb(c.env.DB)
    try{
      const [product] = await db
        .update(products)
        .set(data)
        .where(eq(products.id, id))
        .returning()

      if(!product){
        return c.json({error: 'producto no encontrado'}, 404)
      }

      return c.json(product)
    }catch(error){
      if (isDbConstraintError(error, 'FOREIGN KEY constraint failed')) {
        return c.json({ error: 'no existe una categoria con ese id' }, 409)
      }
      throw error
    }
})


routeProduct.delete('/products/:id', zValidator('param', idSchema), async (c) => {
  const { id } = c.req.valid('param')
  const db = getDb(c.env.DB)
  
  const [deletedProduct] = await db
    .delete(products)
    .where(eq(products.id, id))
    .returning({id: products.id})

  if(!deletedProduct){
    return c.json({error: "producto no encontrado"},404)
  }

  return c.body(null, 204)
})


export default routeProduct