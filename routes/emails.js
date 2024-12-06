const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailsController');
const validateToken = require('../middlewares/authMiddleware');

router.post('/sendorderemail', validateToken, emailController.sendOrderConfirmation);
router.post('/sendonthewayemail', validateToken, emailController.sendOrderStatusUpdateontheway);

module.exports = router;