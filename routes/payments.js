const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/create_preference', paymentController.createPreference);
router.post('/webhook', paymentController.webhook);

module.exports = router;