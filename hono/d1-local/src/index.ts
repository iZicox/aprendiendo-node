import { Hono } from 'hono'
import { idSchema, createProductSchema, updateProductSchema } from './validations';
import { zValidator } from '@hono/zod-validator'

type EnvApp = {
  Bindings: CloudflareBindings;
}

const app = new Hono<EnvApp>()

// listar
app.get('/api/products', async (c) => {
  const { results } = await c.env.DB.prepare('select * from products').all()
  return c.json(results)
})

// listar id
app.get('/api/products/:id', zValidator('param',idSchema), async (c) => {
  const {id} = c.req.valid('param')

  const { results } = await c.env.DB.prepare('select * from products where id = ?').bind(id).run()

  if(!results[0]){
    return c.json({error: 'no encontrado'},400)
  }

  return c.json(results[0])
})

// eliminar
app.delete('/api/products/:id', zValidator('param', idSchema), async (c) => {
  
  const {id} = c.req.valid('param')

  const { meta } = await c.env.DB.prepare('delete from products where id = ?').bind(id).run()

  if (meta.changes === 0) {
    return c.json(
      {
        error: `producto con id ${id} no encontrado`
      },
      400
    )
  }

  return c.json(
    {
      message: `Producto id ${id} eliminado`
    })
})

// eliminar devolviendo fila
app.delete('/api/products/fila/:id', async (c) => {
  const id = c.req.param('id')
  // el first te devuelve la fila
  const row = await c.env.DB
    .prepare('delete from products where id = ? returning *')
    .bind(id)
    .first()
  // verificamos si la fila existe
  if (!row) {
    return c.json(
      {
        error: `producto con id ${Number(id)} no encontrado`
      },
      404
    )
  }
  // devolvemos la fila en json
  return c.json(row)
})

// insertar
// validar con zod



app.post(
  '/api/products',
  zValidator('json', createProductSchema),
  async (c) => {
    const { name, price, stock } = c.req.valid('json')

    const { meta } = await c.env.DB.prepare('insert into products (name, price, stock) values (?,?,?)')
      .bind(name, price, stock)
      // para simplificar en vez de run() se puede usar first() y te devuelve el registro completo para devolverlo en el json sin tener que hacer un select
      .run()


    const created = await c.env.DB.prepare('select * from products where id = ?')
      .bind(meta.last_row_id)
      .first()

    return c.json(created, 201)
  }
)


// edicion parcial
app.patch('/api/products/:id', zValidator('param', idSchema), zValidator('json',updateProductSchema), async (c) => {
  
  const {id} = c.req.valid('param')
  const data = c.req.valid('json')

  const product = await c.env.DB.prepare('select * from products where id = ?')
    .bind(id)
    .first()

  if(!product){
    return c.json({error: 'producto no encontrado'},404)
  }

  const name = data.name ?? product.name
  const price = data.price ?? product.price
  const stock = data.stock ?? product.stock

  await c.env.DB.prepare('update products set name = ?, price = ?, stock = ? where id = ?')
    .bind(name, price, stock, id)
    .run()

  return c.json({
    ...product,
    name,
    price,
    stock
  })
} )

export default app
