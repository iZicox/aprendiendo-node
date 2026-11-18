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

const madrid = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  dateStyle: "short",
  timeStyle: "medium",
})

export const formatMadrid = (d: Date) => madrid.format(d) // '18/11/2026, 11:00:00'
