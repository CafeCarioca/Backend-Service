CREATE DATABASE IF NOT EXISTS cariocaecommerce;
USE cariocaecommerce;

-- Tabla de usuarios
INSERT INTO users (username, email, password, first_name, last_name, document_type, document_number, phone, terms_accepted, factura_con_rut, razon_social, rut, recipient, remarks)
VALUES
('johndoe', 'johndoe@example.com', 'hashedpassword123', 'John', 'Doe', 'CI', '12345678', '099123456', TRUE, FALSE, NULL, NULL, 'John Doe', 'Ninguna'),
('janedoe', 'janedoe@example.com', 'hashedpassword456', 'Jane', 'Doe', 'CI', '87654321', '099654321', TRUE, TRUE, 'Empresa XYZ', '1234567890', 'Jane Doe', 'Entregar después de las 18hs.');

-- Tabla de direcciones
INSERT INTO addresses (user_id, street, door_number, apartment, department, city, state, postal_code, country, latitude, longitude)
VALUES
(1, 'Av. Principal', '123', 'Apto 101', 'Montevideo', 'Montevideo', 'Montevideo', '11200', 'Uruguay', -34.90328, -56.18816),
(2, 'Calle Secundaria', '456', NULL, 'Maldonado', 'Maldonado', 'Montevideo', '20000', 'Uruguay', -34.90990, -54.95158);

-- Tabla de productos
INSERT INTO products (name, description, category, price, toasted, origin, flavors)
VALUES
('Extra Fuerte', 'Café 75% arábica y 25% robusta, con buen cuerpo y aroma intenso.', 'coffee', NULL, 'Oscuro', 'Brasil', 'Chocolate, especias'),
('Fuerte', 'Mezcla de granos torrefactos y tostados para un sabor equilibrado.', 'coffee', NULL, 'Medio', 'Colombia', 'Caramelo, frutos secos'),
('Roma', 'Cápsulas compatibles con Dolce Gusto, sabor pleno y rico.', 'capsules', 409.00, 'Medio-Oscuro', 'Italia', 'Cacao, galleta, frutos secos'),
('Taza de Café', 'Taza de cerámica con logo de la marca.', 'others', 150.00, NULL, NULL, NULL);

-- Tabla de presentaciones (para café en grano)
INSERT INTO presentations (product_id, weight, price)
VALUES
(1, '250g', 517.00),
(1, '500g', 989.00),
(1, '1kg', 1899.00),
(2, '250g', 619.00),
(2, '500g', 1150.00),
(2, '1kg', 2199.00);

-- Tabla de órdenes
INSERT INTO orders (user_id, address_id, order_date, status, total, shipping_type, external_reference)
VALUES
(1, 1, NOW(), 'processing', 1407.00, 'delivery', 'MP-001'),
(2, 2, NOW(), 'completed', 819.00, 'takeaway', 'MP-002');

-- Tabla de items en órdenes
INSERT INTO order_items (order_id, product_id, quantity, price, grams, grind)
VALUES
(1, 3, 2, 409.00, NULL, NULL),  -- 2 cápsulas Roma
(1, 1, 1, 517.00, 250, 'Molido'), -- 250g de Extra Fuerte molido
(2, 4, 1, 150.00, NULL, NULL), -- 1 Taza de Café
(2, 2, 1, 619.00, 250, 'Molido'); -- 250g de Fuerte molido
