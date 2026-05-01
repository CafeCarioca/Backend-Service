const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletterController');
const validateToken = require('../middlewares/authMiddleware');

router.post('/subscribe', newsletterController.subscribe);
router.get('/subscribers', validateToken, newsletterController.getSubscribers);

module.exports = router;
