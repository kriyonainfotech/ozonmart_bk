const express = require('express');
const { updatePersonalDetails, updateBankDetails, updateBusinessInfo, updateDocuments, updateStoreDetails } = require('../controllers/profilecontroller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { upload } = require('../config/cloudinary');
const router = express.Router();

router.use(authMiddleware); // All product routes are private

router.put('/personal', updatePersonalDetails)
router.put('/business', updateBusinessInfo);
// BANK DETAILS (single file)
router.put('/bank', upload.single("cancelledCheque"), updateBankDetails);

// DOCUMENTS (multiple files)
router.put('/documents', upload.fields([
    { name: 'gstCertificate', maxCount: 1 },
    { name: 'panCard', maxCount: 1 },
    { name: 'fssaiLicence', maxCount: 1 },
    { name: 'addressProof', maxCount: 1 },
    { name: 'additionalCertificate', maxCount: 1 } // For optional doc
]), updateDocuments);

// STORE DETAILS (if you want store photos upload)
router.put('/store-details', upload.array("storePhotos", 5), updateStoreDetails);

module.exports = router;