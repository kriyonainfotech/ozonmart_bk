const express = require('express');
const { updatePersonalDetails, updateBankDetails, updateBusinessInfo, updateDocuments, updateStoreDetails } = require('../controllers/profile.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { upload } = require('../config/cloudinary');
const router = express.Router();

router.use(authMiddleware); // All product routes are private

router.put('/personal', updatePersonalDetails)
router.put('/business', updateBusinessInfo);
// BANK DETAILS (single file)
router.put('/bank', upload.single("cancelledCheque"), updateBankDetails);

// DOCUMENTS (multiple files)
router.put('/documents', upload.array("documents", 10), updateDocuments);

// STORE DETAILS (if you want store photos upload)
router.put('/store-details', upload.array("storePhotos", 5), updateStoreDetails);

module.exports = router;