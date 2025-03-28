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
    flavors VARCHAR(255)
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
    external_reference VARCHAR(255) NULL,
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
