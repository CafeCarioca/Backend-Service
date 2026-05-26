ALTER TABLE discounts
MODIFY COLUMN discount_type ENUM('percentage', 'fixed_amount', 'bogo') NOT NULL;
