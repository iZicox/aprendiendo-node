-- ─────────────────────────────────────────────
-- Limpieza (opcional, para re-sembrar en local)
-- ─────────────────────────────────────────────
DELETE FROM refresh_tokens;
DELETE FROM users;
DELETE FROM stock;
DELETE FROM movement;
DELETE FROM product;
DELETE FROM sqlite_sequence WHERE name IN ('movement','product','users');

-- ─────────────────────────────────────────────
-- Catálogos base
-- ─────────────────────────────────────────────
INSERT OR IGNORE INTO movement_type (code, description, sign) VALUES
  ('ENTRY',        'Entrada de mercancía (compra a proveedor)',  1),
  ('EXIT',         'Salida de mercancía (venta / envío)',       -1),
  ('RETURN',       'Devolución de cliente',                      1),
  ('DAMAGE',       'Baja por daño o merma',                     -1),
  ('ADJUST_IN',    'Ajuste de inventario positivo',              1),
  ('ADJUST_OUT',   'Ajuste de inventario negativo',             -1),
  ('TRANSFER_OUT', 'Salida por traspaso a otra ubicación',      -1),
  ('TRANSFER_IN',  'Entrada por traspaso desde otra ubicación',  1);

INSERT OR IGNORE INTO location (code) VALUES
  ('ALMACEN-1'),
  ('ALMACEN-2');

-- ─────────────────────────────────────────────
-- Productos
-- ─────────────────────────────────────────────
INSERT INTO product (id, sku) VALUES
  (1, 'DRV-24V-100W'),
  (2, 'DRV-12V-60W'),
  (3, 'DRV-CC-700MA-20W'),
  (4, 'DRV-DALI-40W'),
  (5, 'DRV-0-10V-150W'),   -- caso límite: stock a 0
  (6, 'DRV-TRIAC-30W');    -- caso límite: sin movimientos

-- ─────────────────────────────────────────────
-- Movimientos (se resuelve location por code)
-- ─────────────────────────────────────────────
WITH v(op, pid, loc, type, qty, tr, note, off) AS (VALUES
  ('op-0001', 1, 'ALMACEN-1', 'ENTRY',        200, NULL,     'Compra proveedor PO-1001',     '-30 days'),
  ('op-0002', 1, 'ALMACEN-1', 'EXIT',          50, NULL,     'Pedido cliente SO-2001',       '-25 days'),
  ('op-0003', 1, 'ALMACEN-1', 'RETURN',         5, NULL,     'Devolución SO-2001',           '-20 days'),
  ('op-0004', 1, 'ALMACEN-1', 'TRANSFER_OUT',  40, 'T-0001', 'Traspaso a ALMACEN-2',         '-15 days'),
  ('op-0004', 1, 'ALMACEN-2', 'TRANSFER_IN',   40, 'T-0001', 'Traspaso desde ALMACEN-1',     '-15 days'),
  ('op-0005', 1, 'ALMACEN-2', 'EXIT',          15, NULL,     'Pedido cliente SO-2002',       '-10 days'),

  ('op-0006', 2, 'ALMACEN-1', 'ENTRY',        300, NULL,     'Compra proveedor PO-1002',     '-28 days'),
  ('op-0007', 2, 'ALMACEN-1', 'EXIT',         120, NULL,     'Pedido cliente SO-2003',       '-18 days'),
  ('op-0008', 2, 'ALMACEN-1', 'DAMAGE',         3, NULL,     'Carcasa rota en recepción',    '-17 days'),
  ('op-0009', 2, 'ALMACEN-1', 'ADJUST_OUT',     2, NULL,     'Recuento inventario',          '-5 days'),

  ('op-0010', 3, 'ALMACEN-1', 'ENTRY',        150, NULL,     'Compra proveedor PO-1003',     '-27 days'),
  ('op-0011', 3, 'ALMACEN-1', 'ADJUST_IN',      4, NULL,     'Recuento inventario',          '-12 days'),
  ('op-0012', 3, 'ALMACEN-1', 'EXIT',          60, NULL,     'Pedido cliente SO-2004',       '-8 days'),
  ('op-0013', 3, 'ALMACEN-1', 'TRANSFER_OUT',  30, 'T-0002', 'Traspaso a ALMACEN-2',         '-6 days'),
  ('op-0013', 3, 'ALMACEN-2', 'TRANSFER_IN',   30, 'T-0002', 'Traspaso desde ALMACEN-1',     '-6 days'),

  ('op-0014', 4, 'ALMACEN-2', 'ENTRY',         80, NULL,     'Compra proveedor PO-1004',     '-22 days'),
  ('op-0015', 4, 'ALMACEN-2', 'EXIT',          25, NULL,     'Pedido cliente SO-2005',       '-9 days'),
  ('op-0016', 4, 'ALMACEN-2', 'DAMAGE',         1, NULL,     'Fallo en prueba de encendido', '-3 days'),

  ('op-0017', 5, 'ALMACEN-1', 'ENTRY',         50, NULL,     'Compra proveedor PO-1005',     '-14 days'),
  ('op-0018', 5, 'ALMACEN-1', 'EXIT',          50, NULL,     'Pedido proyecto SO-2006',      '-2 days')
)
INSERT INTO movement (operation_id, product_id, location_id, movement_type_code, quantity, transfer_id, note, created_at)
SELECT v.op, v.pid, l.id, v.type, v.qty, v.tr, v.note, datetime('now', v.off)
FROM v JOIN location l ON l.code = v.loc;

-- ─────────────────────────────────────────────
-- Stock: proyección calculada desde movement
-- ─────────────────────────────────────────────
INSERT INTO stock (product_id, location_id, quantity)
SELECT m.product_id, m.location_id, SUM(m.quantity * t.sign)
FROM movement m
JOIN movement_type t ON t.code = m.movement_type_code
GROUP BY m.product_id, m.location_id;

-- ─────────────────────────────────────────────
-- Usuarios y refresh tokens
-- ─────────────────────────────────────────────
INSERT INTO users (email, password_hash, role) VALUES
  ('admin@test.local', 'REEMPLAZAR_HASH_ADMIN', 'admin'),
  ('user@test.local',  'REEMPLAZAR_HASH_USER',  'user');

INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES
  ('rt-admin-valid',  (SELECT id FROM users WHERE email='admin@test.local'), CAST(strftime('%s','now','+7 days') AS INTEGER)),
  ('rt-user-valid',   (SELECT id FROM users WHERE email='user@test.local'),  CAST(strftime('%s','now','+7 days') AS INTEGER)),
  ('rt-user-expired', (SELECT id FROM users WHERE email='user@test.local'),  CAST(strftime('%s','now','-1 day')  AS INTEGER));
