import { useEffect, useState } from 'react'
import type {AppType} from '../worker'
import {hc} from 'hono/client'

const client = hc<AppType>('/')

function App() {
  const [saludo, setSaludo] = useState('')

  useEffect(() => {
    async function hola() {
      const res = await client.api.hello.$get()
      const data = await res.json()
      setSaludo(data.message)
    }

    hola()
  }, [])

  return (
  <><h1 className='text-xl'>{saludo}</h1></>
  )
}

export default App
