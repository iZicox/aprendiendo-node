import { z } from 'zod'

export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20)
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export const toOffset = ({ page, pageSize }: PaginationQuery) => ( page - 1 ) * pageSize

export const toPage = <T>(items: T[], total: number, { page, pageSize }: PaginationQuery) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    return {
        meta: {
            page,
            pageSize,
            total,
            totalPages,
            hasPrev: page > 1,
            hasNext: page < totalPages,
        },
        items,
    }
}