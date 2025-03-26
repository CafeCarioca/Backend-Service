const express = require('express');
const router = express.Router();
const orderscontroller = require('../controllers/orderController');
const validateToken = require('../middlewares/authMiddleware');


router.post('/create_order', validateToken,orderscontroller.createOrder);

router.put('/change_order_status/:external_reference', validateToken,orderscontroller.changeOrderStatusByExternalReference);

router.get('/get_order/:orderId', validateToken, orderscontroller.getOrder);

router.get('/checkstatus/:orderId', validateToken, orderscontroller.checkOrderStatus);

router.get('/get_paidorders', validateToken, orderscontroller.getPaidOrders);

router.put('/change_order_status', validateToken, orderscontroller.changeorderstatus);

router.delete('/delete_order/:orderId', validateToken, orderscontroller.deleteorder);

module.exports = router;