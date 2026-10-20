INSERT INTO categories (id, name) VALUES
  (1, 'Electrónica'),
  (2, 'Libros')
ON CONFLICT(id) DO NOTHING;

INSERT INTO products (id, name, price_cents, stock, category_id) VALUES
  (1, 'Teclado', 4999, 10, 1),
  (2, 'Novela', 1999, 5, 2)
ON CONFLICT(id) DO NOTHING;