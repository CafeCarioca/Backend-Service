const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const validateToken = require('../middlewares/authMiddleware');

// Lectura pública: la tienda muestra los descuentos vigentes
router.get('/', discountController.getAllDiscounts);
router.get('/:id', discountController.getDiscountById);
router.get('/:id/products', discountController.getProductsByDiscount);
router.get('/product/:productId/active', discountController.getActiveDiscountForProduct);

// Escritura solo BackOffice (requiere token)
router.post('/', validateToken, discountController.createDiscount);
router.put('/:id', validateToken, discountController.updateDiscount);
router.delete('/:id', validateToken, discountController.deleteDiscount);
router.post('/:id/products', validateToken, discountController.addProductsToDiscount);
router.delete('/:id/products/:productId', validateToken, discountController.removeProductFromDiscount);

module.exports = router;
