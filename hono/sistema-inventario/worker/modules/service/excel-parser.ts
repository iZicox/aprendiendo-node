import * as XSLX from 'xlsx'
import { bodyLimit } from 'hono/body-limit'
import { createFactory } from 'hono/factory'

export type FileRaw = Record<string, unknown>

export function leerExcel(buffer: ArrayBuffer) {
  const result: { result: unknown[][] } = { result: [] }

  const libro = XSLX.read(buffer, {
    type: 'array',
    dense: true,
    sheets: 0,
    cellStyles: false,
    cellHTML: false,
  })
  const hoja = libro.Sheets[libro.SheetNames[0]]

  const filas = XSLX.utils.sheet_to_json<FileRaw>(hoja, {
    header: 1,
    defval: null,
  })

  const sliced = filas.slice(35)

  result.result = sliced.map((fila) => [fila[0] ?? null, fila[15] ?? null])

  return result
}

const factory = createFactory<{ Bindings: Env }>()

export const importExcel = factory.createHandlers(
  bodyLimit({
    maxSize: 5 * 1024 * 1024,
    onError: (c) => c.json({ error: 'archivo demasiado grande' }, 413),
  }),
  async (c) => {
    const body = await c.req.parseBody()
    const file = body['file']
    if (!(file instanceof File)) {
      return c.json({ error: 'falta el archivo' }, 400)
    }
    if (!file.name.endsWith('.xlsx')) {
      return c.json({ error: 'solo .xlsx' }, 415)
    }

    const XLSX = await import('xlsx')
    const wb = XLSX.read(await file.arrayBuffer())
    const hoja = wb.Sheets[wb.SheetNames[0]]
    const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja)

    // aquí procesas: validar con zod, insertar en D1, etc.
    return c.json({
      hoja: wb.SheetNames[0],
      total: filas.length,
      filas: filas.slice(0, 5),
    })
  },
)
