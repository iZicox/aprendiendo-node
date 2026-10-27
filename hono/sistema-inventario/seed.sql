-- ============================================================
-- seed.sql — datos de ejemplo para el sistema de inventario
-- Uso (local):  npx wrangler d1 execute inventario --local  --file=./seed.sql
-- Uso (remoto): npx wrangler d1 execute inventario --remote --file=./seed.sql
-- Requisito: las migraciones ya deben estar aplicadas.
-- El orden de los INSERT respeta las claves foráneas.
-- ============================================================

-- (Opcional, solo desarrollo) Descomenta para volver a cargar desde cero.
-- El orden es inverso al de inserción por las claves foráneas.
-- DELETE FROM stock;
-- DELETE FROM movement;
-- DELETE FROM product;
-- DELETE FROM location;
-- DELETE FROM movement_type;

-- ------------------------------------------------------------
-- 1. Catálogo de tipos de movimiento
-- ------------------------------------------------------------
insert into movement_type (
   code,
   description,
   sign
) values
   ('ENTRY',        'Entrada de mercancía (compra a proveedor)',  1),
   ('EXIT',         'Salida de mercancía (venta / envío)',       -1),
   ('RETURN',       'Devolución de cliente',                      1),
   ('DAMAGE',       'Baja por daño o merma',                      -1),
   ('ADJUST_IN',    'Ajuste de inventario positivo',               1),
   ('ADJUST_OUT',   'Ajuste de inventario negativo',              -1),
   ('TRANSFER_OUT', 'Salida por traspaso a otra ubicación',       -1),
   ('TRANSFER_IN',  'Entrada por traspaso desde otra ubicación',   1);

-- ------------------------------------------------------------
-- 2. Ubicaciones
-- ------------------------------------------------------------
insert into location (
   id,
   code
) values
   (1, 'WAREHOUSE'),
   (2, 'WAREHOUSE_2');

-- ------------------------------------------------------------
-- 3. Productos (10)
-- ------------------------------------------------------------
insert into product (
   id,
   sku,
   created_at,
   updated_at
) values
   ( 1,
     'LAP-ACER-15',
     '2026-08-30 10:00:00',
     '2026-08-30 10:00:00' ),
   ( 2,
     'MOU-LOG-M185',
     '2026-08-30 10:00:00',
     '2026-08-30 10:00:00' ),
   ( 3,
     'KEY-MEC-RGB',
     '2026-08-30 10:00:00',
     '2026-08-30 10:00:00' ),
   ( 4,
     'MON-24-FHD',
     '2026-08-30 10:00:00',
     '2026-08-30 10:00:00' ),
   ( 5,
     'CAB-HDMI-2M',
     '2026-08-30 10:00:00',
     '2026-08-30 10:00:00' ),
   ( 6,
     'USB-32GB',
     '2026-08-30 10:00:00',
     '2026-08-30 10:00:00' ),
   ( 7,
     'HDD-EXT-1TB',
     '2026-08-30 10:00:00',
     '2026-08-30 10:00:00' ),
   ( 8,
     'WEBCAM-1080',
     '2026-08-30 10:00:00',
     '2026-08-30 10:00:00' ),
   ( 9,
     'HEAD-BT-01',
     '2026-08-30 10:00:00',
     '2026-08-30 10:00:00' ),
   ( 10,
     'CHG-USBC-65',
     '2026-08-30 10:00:00',
     '2026-08-30 10:00:00' );

-- ------------------------------------------------------------
-- 4. Movimientos (28), en orden cronológico.
--    quantity siempre es positiva; el signo lo da movement_type.
--    Ningún producto queda en negativo en ningún momento.
-- ------------------------------------------------------------
insert into movement (
   id,
   product_id,
   location_id,
   movementtypecode,
   quantity,
   note,
   created_at
) values
  -- Stock inicial (entradas de compra)
   ( 1,
     1,
     1,
     'ENTRY',
     20,
     'Compra inicial al proveedor',
     '2026-09-01 08:30:00' ),
   ( 2,
     2,
     1,
     'ENTRY',
     100,
     'Compra inicial al proveedor',
     '2026-09-01 08:35:00' ),
   ( 3,
     3,
     1,
     'ENTRY',
     40,
     'Compra inicial al proveedor',
     '2026-09-01 08:40:00' ),
   ( 4,
     4,
     1,
     'ENTRY',
     25,
     'Compra inicial al proveedor',
     '2026-09-01 08:45:00' ),
   ( 5,
     5,
     1,
     'ENTRY',
     200,
     'Compra inicial al proveedor',
     '2026-09-01 09:00:00' ),
   ( 6,
     6,
     1,
     'ENTRY',
     150,
     'Compra inicial al proveedor',
     '2026-09-02 09:00:00' ),
   ( 7,
     7,
     1,
     'ENTRY',
     30,
     'Compra inicial al proveedor',
     '2026-09-02 09:10:00' ),
   ( 8,
     8,
     1,
     'ENTRY',
     45,
     'Compra inicial al proveedor',
     '2026-09-02 09:20:00' ),
   ( 9,
     9,
     1,
     'ENTRY',
     60,
     'Compra inicial al proveedor',
     '2026-09-02 09:30:00' ),
   ( 10,
     10,
     1,
     'ENTRY',
     80,
     'Compra inicial al proveedor',
     '2026-09-02 09:40:00' ),

  -- Ventas, devoluciones y mermas
   ( 11,
     1,
     1,
     'EXIT',
     5,
     'Pedido #1001',
     '2026-09-08 11:15:00' ),
   ( 12,
     2,
     1,
     'EXIT',
     30,
     'Pedido #1002',
     '2026-09-09 12:00:00' ),
   ( 13,
     5,
     1,
     'EXIT',
     60,
     'Pedido #1003',
     '2026-09-10 10:30:00' ),
   ( 14,
     6,
     1,
     'EXIT',
     40,
     'Pedido #1004',
     '2026-09-12 16:45:00' ),
   ( 15,
     4,
     1,
     'EXIT',
     8,
     'Pedido #1005',
     '2026-09-15 13:20:00' ),
   ( 16,
     3,
     1,
     'EXIT',
     12,
     'Pedido #1006',
     '2026-09-16 09:50:00' ),
   ( 17,
     10,
     1,
     'EXIT',
     25,
     'Pedido #1007',
     '2026-09-18 17:05:00' ),
   ( 18,
     9,
     1,
     'EXIT',
     15,
     'Pedido #1008',
     '2026-09-20 11:40:00' ),
   ( 19,
     2,
     1,
     'RETURN',
     3,
     'Devolución del pedido #1002',
     '2026-09-22 10:10:00' ),
   ( 20,
     6,
     1,
     'DAMAGE',
     4,
     'Unidades dañadas en almacén',
     '2026-09-24 15:30:00' ),
   ( 21,
     7,
     1,
     'EXIT',
     10,
     'Pedido #1009',
     '2026-09-25 12:25:00' ),
   ( 22,
     8,
     1,
     'EXIT',
     20,
     'Pedido #1010',
     '2026-10-01 14:00:00' ),

  -- Reposiciones y ajustes
   ( 23,
     1,
     1,
     'ENTRY',
     10,
     'Reposición',
     '2026-10-05 08:30:00' ),
   ( 24,
     5,
     1,
     'ADJUST_OUT',
     6,
     'Ajuste tras inventario físico',
     '2026-10-10 18:00:00' ),
   ( 25,
     4,
     1,
     'ADJUST_IN',
     2,
     'Ajuste tras inventario físico',
     '2026-10-12 18:00:00' ),
   ( 26,
     3,
     1,
     'EXIT',
     20,
     'Pedido #1011',
     '2026-10-15 10:15:00' ),
   ( 27,
     10,
     1,
     'ENTRY',
     40,
     'Reposición',
     '2026-10-18 08:45:00' ),
   ( 28,
     9,
     1,
     'EXIT',
     10,
     'Pedido #1012',
     '2026-10-20 16:20:00' );

-- ------------------------------------------------------------
-- 4.1. Traspasos entre ubicaciones: 8 movimientos adicionales
--
-- Cada traspaso contiene:
--   TRANSFER_OUT: resta en la ubicación de origen.
--   TRANSFER_IN:  suma en la ubicación de destino.
--
-- Ambas filas tienen el mismo producto y cantidad.
-- quantity siempre es positiva.
-- ------------------------------------------------------------
insert into movement (
   id,
   product_id,
   location_id,
   movementtypecode,
   quantity,
   transfer_id,
   note,
   created_at
) values
   -- TRF-001: 5 portátiles de WAREHOUSE a WAREHOUSE_2.
   (29, 1, 1, 'TRANSFER_OUT', 5, 'TRF-001',
    'TRF-001 | WAREHOUSE -> WAREHOUSE_2',
    '2026-10-21 09:00:00'),

   (30, 1, 2, 'TRANSFER_IN', 5, 'TRF-001',
    'TRF-001 | WAREHOUSE -> WAREHOUSE_2',
    '2026-10-21 09:00:00'),

   -- TRF-002: 20 ratones de WAREHOUSE a WAREHOUSE_2.
   (31, 2, 1, 'TRANSFER_OUT', 20, 'TRF-002',
    'TRF-002 | WAREHOUSE -> WAREHOUSE_2',
    '2026-10-21 10:00:00'),

   (32, 2, 2, 'TRANSFER_IN', 20, 'TRF-002',
    'TRF-002 | WAREHOUSE -> WAREHOUSE_2',
    '2026-10-21 10:00:00'),

   -- TRF-003: 30 cables HDMI de WAREHOUSE a WAREHOUSE_2.
   (33, 5, 1, 'TRANSFER_OUT', 30, 'TRF-003',
    'TRF-003 | WAREHOUSE -> WAREHOUSE_2',
    '2026-10-22 09:00:00'),

   (34, 5, 2, 'TRANSFER_IN', 30, 'TRF-003',
    'TRF-003 | WAREHOUSE -> WAREHOUSE_2',
    '2026-10-22 09:00:00'),

   -- TRF-004: regreso de 5 ratones a WAREHOUSE.
   (35, 2, 2, 'TRANSFER_OUT', 5, 'TRF-004',
    'TRF-004 | WAREHOUSE_2 -> WAREHOUSE',
    '2026-10-23 11:00:00'),

   (36, 2, 1, 'TRANSFER_IN', 5, 'TRF-004',
    'TRF-004 | WAREHOUSE_2 -> WAREHOUSE',
    '2026-10-23 11:00:00');

-- ------------------------------------------------------------
-- 5. Stock por producto y ubicación
-- ------------------------------------------------------------
insert into stock (
   product_id,
   location_id,
   quantity,
   updated_at
)
select
   m.product_id,
   m.location_id,
   sum(m.quantity * t.sign),
   max(m.created_at)
from movement m
join movement_type t
   on t.code = m.movementtypecode
group by
   m.product_id,
   m.location_id;