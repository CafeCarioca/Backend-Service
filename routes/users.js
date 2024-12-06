const express = require('express');
const router = express.Router();
const usercontroller = require('../controllers/usercontroller');
const validateToken = require('../middlewares/authMiddleware');

//router.post('/getusers', validateToken, emailController.sendOrderConfirmation);


module.exports = router;