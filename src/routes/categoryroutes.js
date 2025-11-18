const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware.js');
const {
  createCategory,
  getMyCategories,
  updateCategory,
  deleteCategory,
  getMyCategoryById,
} = require('../controllers/categorycontroller.js');

const router = express.Router();

// All category routes are private and require a logged-in seller
router.use(authMiddleware);

// POST /api/v1/categories - Create a new category
router.post('/create', createCategory);

// GET /api/v1/categories - Get all of the seller's categories
router.get('/all', getMyCategories);

// PUT /api/v1/categories/:id - Update a specific category
router.put('/update/:id', updateCategory);

// POST /api/v1/categories/:id - Get a specific category
router.get('/get/:id', getMyCategoryById);

// DELETE /api/v1/categories/:id - Delete a specific category
router.delete('/:id', deleteCategory);

module.exports = router;

/*
// --- cURL Example for /categories (POST) ---
curl -X POST http://localhost:5001/api/v1/categories \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
-d '{
      "name": "Dairy & Bakery",
      "description": "All milk and bread products",
      "attributes": {
        "expiryDateRequired": true,
        "returnPolicy": "3 Days",
        "origin": "India"
      }
    }'
*/