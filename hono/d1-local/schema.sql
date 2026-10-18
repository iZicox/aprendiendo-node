-- Tabla de productos
create table if not exists products (
   id    integer primary key,               -- rowid: se autoincrementa solo
   name  text not null,
   price real not null check ( price >= 0 ),
   stock integer not null default 0 check ( stock >= 0 )
);

-- Datos de ejemplo (opcional, borra o comenta si no los quieres)
insert into products (
   name,
   price,
   stock
) values
   ( 'Teclado mecánico',
     89.99,
     12 ),
   ( 'Mouse inalámbrico',
     24.50,
     30 ),
   ( 'Monitor 27"',
     199.00,
     5 );