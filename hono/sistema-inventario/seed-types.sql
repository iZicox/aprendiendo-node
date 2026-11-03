-- ============================================================
-- seed-types.sql — tipos de movimiento mínimos para producción.
-- A diferencia de seed.sql NO incluye productos/sedes de ejemplo.
-- Idempotente (INSERT OR IGNORE): se puede ejecutar más de una vez.
-- Local:   npm run db:seed:types:local
-- Remoto:  npm run db:seed:types:remote
-- ============================================================

insert or ignore into movement_type (code, description, sign) values
   ('ENTRY',        'Entrada de mercancía (compra a proveedor)',  1),
   ('EXIT',         'Salida de mercancía (venta / envío)',       -1),
   ('RETURN',       'Devolución de cliente',                      1),
   ('DAMAGE',       'Baja por daño o merma',                      -1),
   ('ADJUST_IN',    'Ajuste de inventario positivo',               1),
   ('ADJUST_OUT',   'Ajuste de inventario negativo',              -1),
   ('TRANSFER_OUT', 'Salida por traspaso a otra ubicación',       -1),
   ('TRANSFER_IN',  'Entrada por traspaso desde otra ubicación',   1);
