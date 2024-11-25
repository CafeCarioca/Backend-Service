const express = require('express');
const router = express.Router();
const orderscontroller = require('../controllers/orderController');

router.post('/create_order', orderscontroller.createOrder);
router.put('/change_order_status/:preferenceId', orderscontroller.changeOrderStatusByPreferenceId);

module.exports = router;