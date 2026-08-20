CREATE TABLE IF NOT EXISTS discount_presentations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    discount_id INT NOT NULL,
    presentation_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (discount_id) REFERENCES discounts(id) ON DELETE CASCADE,
    FOREIGN KEY (presentation_id) REFERENCES presentations(id) ON DELETE CASCADE,
    UNIQUE KEY unique_discount_presentation (discount_id, presentation_id),
    INDEX idx_discount_presentation_discount (discount_id),
    INDEX idx_discount_presentation_presentation (presentation_id)
);
