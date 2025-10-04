CREATE TABLE IF NOT EXISTS customer_preferences (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    category VARCHAR(100) NOT NULL,          -- e.g., Clothes, Shoes
    sub_category VARCHAR(100) DEFAULT NULL,  -- e.g., T-Shirts, Jeans
    size VARCHAR(10) DEFAULT NULL,           -- e.g., M, L, 42
    color VARCHAR(50) DEFAULT NULL,          -- e.g., Black, White
    style VARCHAR(100) DEFAULT NULL,         -- e.g., Casual, Formal
    brand VARCHAR(100) DEFAULT NULL,         -- e.g., Nike, Gucci
    year YEAR DEFAULT NULL,                  -- e.g., 2018
    owner_note TEXT DEFAULT NULL,            -- only visible/editable by admins
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_customer_pref FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
