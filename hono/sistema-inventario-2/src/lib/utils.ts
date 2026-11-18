import { sql } from "drizzle-orm"
import { Pagination } from "./types"
import { stock } from "../db/schema"

export const toOffset = (opts: Pagination) => {
  return (opts.page - 1) * opts.pageSize
}
export const toPage = <T>(items: T[], total: number, opts: Pagination) => {
  return {
    items,
    page: opts.page,
    pageSize: opts.pageSize,
    total,
    totalPage: Math.ceil(total / opts.pageSize),
  }
}
export const sumQty = sql<number>`coalesce(sum(${stock.quantity}), 0)`
