const express = require('express');
const { authMiddleware } = require('../middleware/auth.middleware.js');
const {
    updateVariant,
    addVariantToProduct,
    deleteVariant,
} = require('../controllers/variantcontroller.js');

const router = express.Router();
router.use(authMiddleware); // All variant routes are private

// PUT /api/v1/variants/:id - Update a single variant (e.g., stock/price)
router.put('/:id', updateVariant);

// POST /api/v1/variants - Add a new variant to an existing product
router.post('/', addVariantToProduct);

// DELETE /api/v1/variants/:id - Delete a single variant
router.delete('/:id', deleteVariant);

module.exports = router;

/*
// --- cURL Example for /variants/:id (PUT) ---
// (This is how you update stock)
curl -X PUT http://localhost:5001/api/v1/variants/673f8e6b9876543210fedcba \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
-d '{
      "stock": 119
    }'
*/