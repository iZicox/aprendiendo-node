import { Hono } from 'hono'
import productRoute from './routes/products'
import { HTTPException } from 'hono/http-exception'

const app = new Hono()

app.use(async (c, next) => {
  const start = Date.now()

  await next()

  const ms = Date.now() - start

  console.log(`${c.req.method} ${c.req.path} -> ${c.res.status} (${ms} ms)`)
})

// para todas las rutas que no esten mapeadas
app.notFound((c) => {
  return c.json(
    {
      error: 'ruta no encontrada, crack'
    },
    404
  )
})

app.route('/api', productRoute)


app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return error.getResponse()
  }
  console.error(error)
  return c.json({ error: 'error del servidor' }, 500)
})

export default app
