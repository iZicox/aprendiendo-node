import * as XSLX from "xlsx"

export type FileRaw = Record<string, unknown>

export function leerExcel(buffer: ArrayBuffer) {

    const result: { result: unknown[][] } = { result: [] }


    const libro = XSLX.read(buffer, {
        type: 'array',
        dense: true,
        sheets: 0,
        cellStyles: false,
        cellHTML: false
    })
    const hoja = libro.Sheets[libro.SheetNames[0]]

    const filas = XSLX.utils.sheet_to_json<FileRaw>(hoja, { header: 1, defval: null })

    const sliced = filas.slice(35);

    result.result  = sliced.map(fila => [fila[0] ?? null, fila[15] ?? null]);

    return result

}