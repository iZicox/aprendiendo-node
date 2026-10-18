import { Hono } from 'hono'
import z from 'zod'
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
app.get('/api/products/:id', async (c) => {
  const id = c.req.param('id')
  const { results } = await c.env.DB.prepare('select * from products where id = ?').bind(id).run()

  return c.json(results[0])
})

// eliminar
app.delete('/api/products/:id', async (c) => {
  const id = c.req.param('id')
  const { meta } = await c.env.DB.prepare('delete from products where id = ?').bind(id).run()

  if (meta.changes === 0) {
    return c.json(
      {
        erro: `producto con id ${Number(id)} no encontrado`
      },
      404
    )
  }

  return c.json(
    {
      message: `Producto id ${Number(id)} eliminado`
    })
})

// eliminar devolviendo fila
app.delete('/api/products/fila/:id', async (c) => {
  const id = c.req.param('id')
  // el fist te devuelve la fila
  const row = await c.env.DB.prepare('delete from products where id = ?').bind(id).first()
  // verificamos si la fila existe
  if (!row) {
    return c.json(
      {
        erro: `producto con id ${Number(id)} no encontrado`
      },
      404
    )
  }
  // devolvemos la fila en json
  return c.json(row)
})

// insertar
// validar con zod
const createProductSchema = z.object({
  name: z.string().min(1).trim(),
  price: z.number().positive(),
  stock: z.number().int().nonnegative()
})


app.post(
  '/api/products',
  zValidator('json', createProductSchema, (result, c) => {
    if (!result.success) {
      return c.json({ errors: z.treeifyError(result.error) }, 400)
    }
  }),
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
  })

export default app
