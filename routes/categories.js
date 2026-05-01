const express = require('express');
const router = express.Router();
const { getAllCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const validateToken = require('../middlewares/authMiddleware');

router.get('/', getAllCategories);
router.post('/', validateToken, createCategory);
router.put('/:id', validateToken, updateCategory);
router.delete('/:id', validateToken, deleteCategory);

module.exports = router;
