import { DrizzleD1Database } from "drizzle-orm/d1"
import { NewProduct } from "../lib/types"
import { deleteById } from "../controller/location.controller"
import { product, stock } from "../db/schema"
import { asc, eq, sum } from "drizzle-orm"

export class ProductRepository {
  private db: DrizzleD1Database
  constructor(db: DrizzleD1Database) {
    this.db = db
  }

  async create(newProduct: NewProduct) {
    const [row] = await this.db.insert(product).values(newProduct).returning()
    return row
  }

  /**
   * 
  sql para listar todos con suma

  select p.sku, sum(s.quantity) 
  from stock s 
  inner join product p on p.id = s.product_id 
  group by p.sku
  */
  // GET /products
  async getAll(pageSize: number, offset: number) {
    return await this.db
      .select({
        sku: product.sku,
        stock: sum(stock.quantity),
      })
      .from(stock)
      .innerJoin(product, eq(product.id, stock.productId))
      .groupBy(product.sku)
      .orderBy(asc(product.sku))
      .limit(pageSize)
      .offset(offset)
  }

  /**
   * 
   sql para sacar un producto y su inventario

  select p.sku, sum(s.quantity) 
    from stock s 
    inner join product p 
      on p.id = s.product_id 
    where p.id = '1' 
    group by p.sku
  */
  // GET /products/:id
  async getById(id: number) {
    const [row] = await this.db
      .select({
        sku: product.sku,
        stock: sum(stock.quantity),
      })
      .from(stock)
      .innerJoin(product, eq(product.id, stock.productId))
      .where(eq(product.id, id))
      .groupBy(product.sku)
    return row
  }
  // GET /products/:sku
  async getBySku(sku: string) {
    const [row] = await this.db
      .select({
        sku: product.sku,
        stock: sum(stock.quantity),
      })
      .from(stock)
      .innerJoin(product, eq(product.id, stock.productId))
      .where(eq(product.sku, sku))
      .groupBy(product.sku)
    return row
  }
  // DELETE /products/:id
  async deleteById(id: number) {}
  // DELETE /products/:sku
  async deleteBySku(sku: string) {}
}

/**
 
sql de listado de inventario por almacen

select p.sku, sum(s.quantity) from stock s inner join product p on p.id = s.product_id inner join location l on l.id = s.location_id where l.id = '1' group by p.sku
 */
