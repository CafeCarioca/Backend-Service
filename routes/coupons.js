const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const validateToken = require('../middlewares/authMiddleware');

// Rutas públicas
router.post('/validate', couponController.validateCoupon); // Validar cupón por código

// Rutas de gestión (solo BackOffice, requieren token)
// GET también protegido: listar los códigos permitiría adivinar cupones válidos
router.get('/', validateToken, couponController.getAllCoupons);
router.get('/:id', validateToken, couponController.getCouponById);
router.post('/', validateToken, couponController.createCoupon);
router.put('/:id', validateToken, couponController.updateCoupon);
router.delete('/:id', validateToken, couponController.deleteCoupon);

module.exports = router;
