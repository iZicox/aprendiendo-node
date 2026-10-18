import { Hono } from "hono"
import db from '../db.json'
import { zValidator } from "@hono/zod-validator"
import { createProductSchema, updateProductSchema, validationHook } from "../validations"

const app = new Hono()

// listar todos
app.get('/products', (c) => {
    return c.json(db.products)
})

// listar por id
app.get('/products/:id', (c) => {
    const id = Number(c.req.param('id'))
    const producto = db.products.find((ele) => ele.id === id)

    if (!producto) {
        return c.json({
            error: "producto no encontrado"
        }, 404)
    }

    return c.json(producto)
})

// eliminar por id
app.delete('/products/:id', (c) => {
    const id = Number(c.req.param('id'))

    const index = db.products.findIndex((ele) => ele.id === id)

    if (index === -1) {
        return c.json(
            {
                error: `producto no encontrado con el id ${id}`
            },
            404
        )
    }

    db.products.splice(index, 1)

    return c.body(null, 204)
})

// insertar
app.post('/products', zValidator('json', createProductSchema, validationHook), (c) => {

    const data = c.req.valid('json')

    const newProduct = {
        id: Date.now(),
        ...data
    }

    db.products.push(newProduct)

    return c.json(newProduct, 201)

})

// actualizar
app.patch('/products/:id', zValidator('json', updateProductSchema, validationHook), (c) => {

    const id = Number(c.req.param('id'))
    const data = c.req.valid('json')

    const product = db.products.find((p) => p.id === id)

    if (!product) {
        return c.json(
            {
                error: `producto con el id ${id} no encontrado`
            },
            404
        )
    }

    Object.assign(product, data)

    return c.json(product)
})

export default app