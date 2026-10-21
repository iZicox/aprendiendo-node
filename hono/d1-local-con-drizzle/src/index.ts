import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Env } from './types'
import  routeCategory  from './routes/routes.categories'
import routeProduct from './routes/routes.products'
import { HTTPException } from 'hono/http-exception'


const app = new Hono<Env>()

app.use('/api/*', cors())

app.route('/api', routeProduct)
app.route('/api', routeCategory)

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return error.getResponse()
  }
  console.error(error)
  return c.json({ error: 'error del servidor' }, 500)
})

export default app


