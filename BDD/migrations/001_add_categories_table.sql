-- Crear tabla de categorías
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INT DEFAULT 999,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar las 3 categorías existentes
INSERT IGNORE INTO categories (slug, name, description, display_order) VALUES
('coffee',   'Café',      'Nuestro café, tu tradición. Desde 1916, Carioca ha llevado el arte del café a tu mesa con mezclas únicas y cuidadosamente elaboradas. Disfruta de la calidad y el sabor que nos caracteriza en cada grano.', 1),
('capsules', 'Cápsulas',  'Seleccionamos una variedad de cápsulas premium diseñadas para satisfacer los paladares más exigentes. En Carioca nos apasiona llevar calidad y tradición a tu taza.', 2),
('others',   'Métodos',   'Descubre nuestra selección de métodos de preparación. Cada método ofrece una experiencia única para disfrutar de tu café favorito.', 3);

-- Quitar el CHECK constraint de products.category para aceptar slugs dinámicos
ALTER TABLE products MODIFY COLUMN category VARCHAR(50) NOT NULL;
