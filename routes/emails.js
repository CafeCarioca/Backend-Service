const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailsController');

router.post('/sendorderemail', emailController.sendOrderConfirmation);
router.post('/sendonthewayemail', emailController.sendOrderStatusUpdateontheway);

module.exports = router;