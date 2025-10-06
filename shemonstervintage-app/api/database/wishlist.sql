CREATE TABLE IF NOT EXISTS wishlist (
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
    
    CONSTRAINT fk_wishlist_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
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
-- End of file: api/database/wishlist.sql