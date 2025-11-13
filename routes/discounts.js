const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');

// Rutas de descuentos
router.get('/', discountController.getAllDiscounts);
router.get('/:id', discountController.getDiscountById);
router.post('/', discountController.createDiscount);
router.put('/:id', discountController.updateDiscount);
router.delete('/:id', discountController.deleteDiscount);

// Rutas para gestionar productos en descuentos
router.post('/:id/products', discountController.addProductsToDiscount);
router.delete('/:id/products/:productId', discountController.removeProductFromDiscount);
router.get('/:id/products', discountController.getProductsByDiscount);

// Ruta para obtener descuento activo de un producto
router.get('/product/:productId/active', discountController.getActiveDiscountForProduct);

module.exports = router;
