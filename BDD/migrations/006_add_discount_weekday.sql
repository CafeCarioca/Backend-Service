-- Semana Carioca: descuentos que valen un solo día de la semana.
-- weekday: 0 = domingo, 1 = lunes ... 6 = sábado (hora de Uruguay). NULL = todos los días.
ALTER TABLE discounts ADD COLUMN weekday TINYINT NULL DEFAULT NULL AFTER end_date;

-- Los 5 descuentos fijos de la Semana Carioca: 25% en la bolsa de 500 g.
-- El número del café coincide con el día: lunes = café 1 (INTENSO) ... viernes = café 5 (GOURMET).
INSERT INTO discounts (name, description, discount_type, discount_value, is_active, delivery_type, weekday) VALUES
  ('Semana Carioca - Lunes',     'Café 1 al 25% los lunes (500 g)',     'percentage', 25, 1, 'both', 1),
  ('Semana Carioca - Martes',    'Café 2 al 25% los martes (500 g)',    'percentage', 25, 1, 'both', 2),
  ('Semana Carioca - Miércoles', 'Café 3 al 25% los miércoles (500 g)', 'percentage', 25, 1, 'both', 3),
  ('Semana Carioca - Jueves',    'Café 4 al 25% los jueves (500 g)',    'percentage', 25, 1, 'both', 4),
  ('Semana Carioca - Viernes',   'Café 5 al 25% los viernes (500 g)',   'percentage', 25, 1, 'both', 5);

-- Cada descuento va al producto con el mismo número (id 1 a 5).
INSERT INTO product_discounts (product_id, discount_id)
SELECT d.weekday, d.id FROM discounts d
WHERE d.name LIKE 'Semana Carioca - %' AND d.weekday BETWEEN 1 AND 5;

-- Solo la presentación de 500 g de cada café.
INSERT INTO discount_presentations (discount_id, presentation_id)
SELECT d.id, pr.id FROM discounts d
JOIN presentations pr ON pr.product_id = d.weekday AND REPLACE(LOWER(pr.weight), ' ', '') IN ('500', '500g')
WHERE d.name LIKE 'Semana Carioca - %' AND d.weekday BETWEEN 1 AND 5;

-- El descuento "Semana Carioca" que se cambiaba a mano cada día queda reemplazado.
UPDATE discounts SET is_active = 0 WHERE name = 'Semana Carioca';
