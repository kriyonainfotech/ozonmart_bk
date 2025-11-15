const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'))
router.use('/category', require('./category.routes'))
router.use('/product', require('./product.routes'))
router.use('/profile', require('./profile.routes'))

module.exports = router;