const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas las rutas del dashboard requieren autenticación
router.get('/stats', authMiddleware, dashboardController.getStats);
router.get('/sales-by-month', authMiddleware, dashboardController.getSalesByMonth);
router.get('/recent-users', authMiddleware, dashboardController.getRecentUsers);
router.get('/recent-orders', authMiddleware, dashboardController.getRecentOrders);
router.get('/top-products', authMiddleware, dashboardController.getTopProducts);
router.get('/shipping-breakdown', authMiddleware, dashboardController.getShippingBreakdown);
router.get('/average-ticket', authMiddleware, dashboardController.getAverageTicket);
router.get('/top-customers', authMiddleware, dashboardController.getTopCustomers);
router.get('/sales-by-hour', authMiddleware, dashboardController.getSalesByHour);

module.exports = router;
