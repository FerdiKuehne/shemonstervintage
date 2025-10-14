-- Drop tables first (drops indexes automatically)
DROP TABLE IF EXISTS wishlist;
DROP TABLE IF EXISTS customer_preferences;
DROP TABLE IF EXISTS admin;
DROP TABLE IF EXISTS customers;

-- Create tables
CREATE TABLE customers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    zipcode VARCHAR(10) DEFAULT NULL,
    street VARCHAR(100) DEFAULT NULL,
    street_number VARCHAR(10) DEFAULT NULL,
    city VARCHAR(100) DEFAULT NULL,
    country CHAR(2) DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    instagram VARCHAR(50) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_customer_username (username),
    INDEX idx_customer_email (email)
);

CREATE TABLE customer_preferences (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL,
    category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100) DEFAULT NULL,
    size VARCHAR(10) DEFAULT NULL,
    style VARCHAR(100) DEFAULT NULL,
    brand VARCHAR(100) DEFAULT NULL,
    decade YEAR DEFAULT NULL,
    owner_note TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_pref FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE wishlist (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL,
    category VARCHAR(100) NOT NULL,
    sub_category VARCHAR(100) DEFAULT NULL,
    size VARCHAR(10) DEFAULT NULL,
    color VARCHAR(50) DEFAULT NULL,
    style VARCHAR(100) DEFAULT NULL,
    brand VARCHAR(100) DEFAULT NULL,
    year YEAR DEFAULT NULL,
    owner_note TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wishlist_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Indexes for wishlist (no IF NOT EXISTS)
CREATE INDEX idx_wishlist_customer ON wishlist(customer_id);
CREATE INDEX idx_wishlist_category ON wishlist(category);
CREATE INDEX idx_wishlist_sub_category ON wishlist(sub_category);
CREATE INDEX idx_wishlist_brand ON wishlist(brand);
CREATE INDEX idx_wishlist_size ON wishlist(size);
CREATE INDEX idx_wishlist_color ON wishlist(color);
CREATE INDEX idx_wishlist_year ON wishlist(year);
CREATE INDEX idx_wishlist_created_at ON wishlist(created_at);
CREATE INDEX idx_wishlist_owner_note ON wishlist(owner_note(255));
CREATE INDEX idx_wishlist_style ON wishlist(style);

CREATE TABLE admin (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
