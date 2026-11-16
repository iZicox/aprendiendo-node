/**
 * 
 

sql para listar todos con suma

select p.sku, sum(s.quantity) 
from stock s 
inner join product p on p.id = s.product_id 
group by p.sku

 */

/**
 * 
 sql para sacar un producto y su inventario

 select p.sku, sum(s.quantity) from stock s inner join product p on p.id = s.product_id where p.id = '1' group by p.sku
 */

/**
 
sql de listado de inventario por almacen

select p.sku, sum(s.quantity) from stock s inner join product p on p.id = s.product_id inner join location l on l.id = s.location_id where l.id = '1' group by p.sku
 */