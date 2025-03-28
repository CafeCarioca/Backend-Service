// routes/products.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const validateToken = require('../middlewares/authMiddleware');


// Endpoints productos

router.get('/', productController.getAllProducts);

router.get('/:id', productController.getProductById);

router.post('/',validateToken, productController.createProduct);

router.put('/:id',validateToken, productController.updateProduct);

router.delete('/:id',validateToken, productController.deleteProduct);




// export the router module so that server.js file can use it
module.exports = router;


