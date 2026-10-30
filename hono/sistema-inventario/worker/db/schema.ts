import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ─────────────────────────────────────────────────────────────
// movement_type — catálogo de tipos. Extensible por INSERT.
// ─────────────────────────────────────────────────────────────
export const movementType = sqliteTable('movement_type', {
  code: text('code').primaryKey(), // 'ENTRY', 'EXIT', ...
  description: text('description').notNull(),
  sign: integer('sign').notNull(), // 1 = suma, -1 = resta
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
})

// ─────────────────────────────────────────────────────────────
// location — en MVP solo existe 'WAREHOUSE'.
// ─────────────────────────────────────────────────────────────
export const location = sqliteTable('location', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
})

// ─────────────────────────────────────────────────────────────
// product — catálogo mínimo.
// ─────────────────────────────────────────────────────────────
export const product = sqliteTable('product', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sku: text('sku').notNull().unique(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
})

// ─────────────────────────────────────────────────────────────
// movement — historial inmutable (append-only).
// type es FK a movement_type.code.
// ─────────────────────────────────────────────────────────────
export const movement = sqliteTable(
  'movement',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    // Operación idempotente que originó este movimiento (nullable: datos sembrados).
    operationId: text('operation_id').references(() => movementOperation.id),
    productId: integer('product_id')
      .notNull()
      .references(() => product.id),
    locationId: integer('location_id')
      .notNull()
      .references(() => location.id),
    movementTypeCode: text('movementTypeCode')
      .notNull()
      .references(() => movementType.code),
    quantity: integer('quantity').notNull(),
    transferId: text('transfer_id'),
    note: text('note'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index('idx_movement_product').on(table.productId, table.createdAt),
    index('idx_movement_location').on(table.locationId, table.createdAt),
    index('idx_movement_type').on(table.movementTypeCode, table.createdAt),
    index('idx_movement_operation').on(table.operationId),
    // Una transferencia no puede repetir la misma pierna (OUT/IN) con el mismo id.
    // transfer_id NULL (movimientos comunes) no choca: los NULL no son distintos en SQLite.
    uniqueIndex('uniq_movement_transfer_leg').on(
      table.transferId,
      table.movementTypeCode,
    ),
    check('movement_quantity_positive', sql`${table.quantity} > 0`),
  ],
)

// ─────────────────────────────────────────────────────────────
// stock — proyección por (product_id, location_id).
// El CHECK es el árbitro que aborta el batch en D1.
// ─────────────────────────────────────────────────────────────
export const stock = sqliteTable(
  'stock',
  {
    productId: integer('product_id')
      .notNull()
      .references(() => product.id),
    locationId: integer('location_id')
      .notNull()
      .references(() => location.id),
    quantity: integer('quantity').notNull().default(0),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.locationId] }),
    check('stock_quantity_non_negative', sql`${table.quantity} >= 0`),
    index('idx_stock_location').on(table.locationId),
  ],
)

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: text('role', { enum: ['admin', 'user'] })
      .notNull()
      .default('user'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    check('users_role_check', sql`${table.role} IN ('admin', 'user')`),
  ],
)

// ─────────────────────────────────────────────────────────────
// movement_operation — registro de idempotencia.
// Una fila = una operación lógica (un movimiento o una transferencia)
// confirmada; su llave única es (user_id, idempotency_key).
// ─────────────────────────────────────────────────────────────
export const movementOperation = sqliteTable(
  'movement_operation',
  {
    id: text('id').primaryKey(), // UUID interno (no es la llave del cliente)
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    idempotencyKey: text('idempotency_key').notNull(),
    requestHash: text('request_hash').notNull(),
    kind: text('kind', { enum: ['movement', 'transfer'] }).notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex('uniq_movement_operation_user_key').on(
      table.userId,
      table.idempotencyKey,
    ),
  ],
)

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  familyId: text('family_id').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})
