CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    zipcode VARCHAR(10) DEFAULT NULL,
    street VARCHAR(100) DEFAULT NULL,
    street_number VARCHAR(10) DEFAULT NULL,
    city VARCHAR(100) DEFAULT NULL,
    country CHAR(2) DEFAULT NULL,  -- ISO code (e.g., "DE", "US")
    phone VARCHAR(20) DEFAULT NULL,
    instagram VARCHAR(50) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,  -- for soft-deletes
    
    INDEX idx_customer_username (username),
    INDEX idx_customer_email (email)
);
