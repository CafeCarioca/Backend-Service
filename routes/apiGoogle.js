// routes/apiGoogle.js
const express = require('express');
const router = express.Router();

const apiGoogleController = require('../controllers/apiGoogleController');


router.get('/', apiGoogleController.getReviews);


module.exports = router;