const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');

// Rutas públicas
router.post('/validate', couponController.validateCoupon); // Validar cupón por código

// Rutas de gestión (sin autenticación, igual que descuentos)
router.get('/', couponController.getAllCoupons);
router.get('/:id', couponController.getCouponById);
router.post('/', couponController.createCoupon);
router.put('/:id', couponController.updateCoupon);
router.delete('/:id', couponController.deleteCoupon);

module.exports = router;
