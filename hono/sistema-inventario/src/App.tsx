import { useEffect, useState } from 'react'
import type {AppType} from '../worker'
import {hc, type InferResponseType} from 'hono/client'

const client = hc<AppType>('/')

type Products = InferResponseType<typeof client.api.products.$get>

function App() {
  const [products, setProducts] = useState<Products>([])

  useEffect(() => {
    async function getProducts() {
      const res = await client.api.products.$get()
      const data = await res.json()
      setProducts(data)
    }
    getProducts()
  }, [])

  return (
  <>
    <h1 className='text-xl'>Productos</h1>
    {products.map((ele, i) => (
      <pre key={i}>
        {JSON.stringify(ele, null, 2)}
      </pre>
    ))}
  </>
  )
}

export default App
