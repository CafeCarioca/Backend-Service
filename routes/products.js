// routes/products.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Define a route

router.get('/101', (req, res) => {
    res.send('this is product 101 route');// this gets executed when user visit http://localhost:3000/product/101
});

router.get('/102', (req, res) => {
    res.send('this is product 102 route');// this gets executed when user visit http://localhost:3000/product/102
});


// Endpoints productos

router.get('/', productController.getAllProducts);

router.get('/:id', productController.getProductById);

router.post('/', productController.createProduct);

router.put('/:id', productController.updateProduct);

router.delete('/:id', productController.deleteProduct);




// export the router module so that server.js file can use it
module.exports = router;


