import z from "zod"

export const idSchema = z.coerce.number().int().positive()
export const idSchemaParam = z.object({ id: idSchema })
