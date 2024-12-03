const express = require('express');
const router = express.Router();
const orderscontroller = require('../controllers/orderController');

router.post('/create_order', orderscontroller.createOrder);
router.put('/change_order_status/:preferenceId', orderscontroller.changeOrderStatusByPreferenceId);
router.get('/get_order/:orderId', orderscontroller.getOrder);
router.get('/checkstatus/:orderId', orderscontroller.checkOrderStatus);
router.get('/get_paidorders', orderscontroller.getPaidOrders);
router.put('/change_order_status', orderscontroller.changeorderstatus);
router.delete('/delete_order/:orderId', orderscontroller.deleteorder);

module.exports = router;