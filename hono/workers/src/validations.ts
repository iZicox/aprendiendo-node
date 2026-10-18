import { z } from "zod";
import type { Hook } from "@hono/zod-validator";

export const createProductSchema = z.object({
    name: z.string().min(3, 'Nombre obligatorio de 3 caracteres o mas'),
    price: z.number().positive('Precio mayor a 0'),
    stock: z.number().int('Numero entero').nonnegative('Numero mayor o igual a cero').optional().default(0)
});

export const updateProductSchema = z.object({
    name: z.string().min(3).optional(),
    price: z.number().positive().optional(),
    stock: z.number().int().nonnegative().optional()
});

export const validationHook: Hook<any, any, any> = (result, c) => {
    if (!result.success) {
        return c.json(
            {
                error: 'datos invalidos',
                detalles: result.error.issues.map((issue) => issue.message)
            },
            400
        )
    }
}