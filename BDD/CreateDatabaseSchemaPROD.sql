CREATE DATABASE IF NOT EXISTS cariocaecommerce;
USE cariocaecommerce;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    document_type VARCHAR(20),
    document_number VARCHAR(50),
    phone VARCHAR(20),
    terms_accepted BOOLEAN,
    factura_con_rut BOOLEAN,
    razon_social VARCHAR(255),
    rut VARCHAR(50),
    recipient VARCHAR(255),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de direcciones
CREATE TABLE IF NOT EXISTS addresses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    street VARCHAR(255) NOT NULL,
    door_number VARCHAR(10),
    apartment VARCHAR(10),
    department VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabla de productos con categorías, sabores y origen
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('capsules', 'coffee', 'others')),
    price DECIMAL(10,2) NULL,
    toasted VARCHAR(255),
    origin VARCHAR(100),
    flavors VARCHAR(255), 
    available BOOLEAN DEFAULT TRUE, 
    image_url VARCHAR(255),
    secondary_image_url VARCHAR(255),
    display_order INT DEFAULT 999,
    INDEX idx_display_order (display_order)
);

-- Tabla de presentaciones para café en grano
CREATE TABLE IF NOT EXISTS presentations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    weight VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Tabla de órdenes
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    address_id INT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    shipping_type ENUM('takeaway', 'delivery') NOT NULL DEFAULT 'delivery',
    shipping_cost DECIMAL(10,2) DEFAULT 0.00,
    external_reference VARCHAR(255) NULL,
    coupon_code VARCHAR(50) NULL,
    coupon_discount DECIMAL(10,2) DEFAULT 0.00,
    product_discount DECIMAL(10,2) DEFAULT 0.00,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (address_id) REFERENCES addresses(id)
);

-- Tabla de items en órdenes
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    grams INT,
    grind VARCHAR(50),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Tabla de cupones de descuento
CREATE TABLE IF NOT EXISTS coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type ENUM('percentage','fixed_amount') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  delivery_type ENUM('both','delivery','takeaway') NOT NULL DEFAULT 'both',
  min_purchase_amount DECIMAL(10,2) DEFAULT 0.00,
  max_uses INT DEFAULT NULL,
  current_uses INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_active (is_active),
  INDEX idx_dates (start_date, end_date)
);

-- Tabla intermedia para relacionar órdenes con cupones
CREATE TABLE IF NOT EXISTS order_coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  coupon_id INT NOT NULL,
  discount_applied DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
  INDEX idx_order (order_id),
  INDEX idx_coupon (coupon_id)
);

-- Tabla principal de descuentos
CREATE TABLE IF NOT EXISTS discounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type ENUM('percentage', 'fixed_amount') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE NULL,
    end_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active),
    INDEX idx_dates (start_date, end_date)
);

-- Tabla intermedia para relacionar productos con descuentos
CREATE TABLE IF NOT EXISTS product_discounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    discount_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (discount_id) REFERENCES discounts(id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_discount (product_id, discount_id),
    INDEX idx_product (product_id),
    INDEX idx_discount (discount_id)
);
