const express = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware.js');
const {
  createProduct,
  getMyProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require('../controllers/productcontroller.js');
const { upload } = require('../config/cloudinary.js');

const router = express.Router();
router.use(authMiddleware); // All product routes are private

// POST /api/v1/products - Create a new product and its variants
router.post('/create', upload.array('images'), createProduct);

// GET /api/v1/products - Get all products (parent level)
router.get('/all', getMyProducts);

// GET /api/v1/products/:id - Get one product and its variants
router.get('/get/:id', getProductById);

// PUT /api/v1/products/:id - Update product (parent) details
router.put('/update/:id', upload.array('images'), updateProduct);

// DELETE /api/v1/products/:id - Delete product and all variants
router.delete('/:id', deleteProduct);

module.exports = router;

/*
// --- cURL Example for /products (POST) ---
curl -X POST http://localhost:5001/api/v1/products \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
-d '{
      "categoryId": "673f8e6b1234567890abcdef",
      "title": "Amul Butter",
      "brand": "Amul",
      "description": "The delicious taste of Amul butter.",
      "images": ["http://cloudinary.com/image1.jpg"],
      "shippingDetails": { "weight": 500 },
      "taxPercentage": 5,
      "hsnCode": "04051000",
      "status": "published",
      "variants": [
        {
          "name": "500g",
          "sku": "AMUL-BTR-500G",
          "mrp": 285,
          "sellingPrice": 260,
          "stock": 120
        },
        {
          "name": "100g",
          "sku": "AMUL-BTR-100G",
          "mrp": 60,
          "sellingPrice": 60,
          "stock": 300
        }
      ]
    }'
*/