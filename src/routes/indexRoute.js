const express = require('express');
const router = express.Router();

router.use('/auth', require('./authroutes'))
router.use('/category', require('./categoryroutes'))
router.use('/product', require('./productroutes'))
router.use('/profile', require('./profileroutes'))

module.exports = router;