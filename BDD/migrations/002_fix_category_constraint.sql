-- Eliminar el CHECK constraint explícitamente (MySQL 8+)
ALTER TABLE products DROP CONSTRAINT products_chk_1;

-- Redefinir la columna sin constraint
ALTER TABLE products MODIFY COLUMN category VARCHAR(50) NOT NULL;
