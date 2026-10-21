import { Hono } from "hono"
import { Env } from "../types"
import { getDb, isDbConstraintError } from "../db/client"
import { categories, products } from "../db/schema"
import { zValidator } from "@hono/zod-validator"
import { createCategory, idSchema, updateCategory } from "../validators"
import { eq } from "drizzle-orm"

const routeCategory = new Hono<Env>()

// listar todos
routeCategory.get('/categories', async (c) => {
  const db = getDb(c.env.DB)
  const rows = await db.select().from(categories)
  return c.json(rows)
})

// listar por id
routeCategory.get('/categories/:id',zValidator('param', idSchema), async (c) => {
  const { id } = c.req.valid('param')
  const db = getDb(c.env.DB)
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id,id))
    .limit(1)
 
  if(!category){
    return c.json({error: 'no encontrado'},404)
  }

  return c.json(category)
})

// insertar
routeCategory.post('/categories', zValidator('json', createCategory), async (c) => {

  const {name} = c.req.valid('json')
  const db = getDb(c.env.DB)

  try{
    const [newCategory] = await db
      .insert(categories) 
      .values({name: name})
      .returning()

    c.header('Location', `/categories/${newCategory.id}`)
    return c.json(newCategory, 201)

  } catch(error){
    if(isDbConstraintError(error, 'UNIQUE constraint failed')){
      return c.json({ error: 'ya existe una categoría con ese nombre' }, 409)
    }
    throw error
  }
})

// eliminar
routeCategory.delete('/categories/:id', zValidator('param', idSchema), async (c) => {
  
  const {id} = c.req.valid('param')
  const db = getDb(c.env.DB)

  const [productsExist] = await db
    .select()
    .from(products)
    .where(eq(products.categoryId, id))
    .limit(1)

  if(productsExist){ 
    return c.json({error: 'no se puede eliminar la categoria porque tiene productos relacionados'},  409)
  }

  const [deleteCategory] = await db
    .delete(categories)
    .where(eq(categories.id,id))
    .returning({id: categories.id})

  if(!deleteCategory){
    return c.json({error: 'categoria no existe'},404)
  }

  return c.body(null,204)
})

routeCategory.patch('/categories/:id', zValidator('json',updateCategory), zValidator('param', idSchema), async (c) => {
  const {id} = c.req.valid('param')
  const {name} = c.req.valid('json')
  const db = getDb(c.env.DB)
  try{
    const [edit] = await db.update(categories).set({name: name}).where(eq(categories.id, id)).returning()

    if(!edit){
      return c.json({
        error: 'categoria no existe'
      },
      404)
    }
    return c.json(edit)
  }catch(err){
    if(isDbConstraintError(err,  'UNIQUE constraint failed')){
      return c.json({ error: 'ya existe una categoría con ese nombre' }, 409)
    }
    throw err
  }
  
})

export default routeCategory