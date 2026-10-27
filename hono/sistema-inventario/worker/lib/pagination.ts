import type { Page, PaginationQuery } from '../db/types'

export const toOffset = ({ page, pageSize }: PaginationQuery): number =>
  (page - 1) * pageSize

export const toPage = <T>(
  items: T[],
  total: number,
  { page, pageSize }: PaginationQuery,
): Page<T> => {
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
