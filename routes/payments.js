const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const validateToken = require('../middlewares/authMiddleware');

router.post('/create_preference', validateToken,paymentController.createPreference);
router.post('/webhook', paymentController.webhook);

module.exports = router;