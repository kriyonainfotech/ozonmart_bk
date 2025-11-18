const express = require('express');
const { registerStart, verifyEmail, updateBusinessInfo, updateBankDetails, updateDocuments, updateStoreDetails, loginWithPassword, loginOtpRequest, loginOtpVerify, getCheckAuth, getSellerFull, getDashboardMetrics } = require('../controllers/auth.controller');
const { check } = require('express-validator');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { upload } = require('../config/cloudinary');

const router = express.Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Start registration, create user, send OTP
 * @access  Public
 */
router.post('/register', registerStart);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email with OTP and issue JWT
 * @access  Public
 */
router.post('/verify-email', [
    check('email', 'Please include a valid email').isEmail(),
    check('otp', 'OTP is required').not().isEmpty().trim(),
], verifyEmail);

//step-2 registration business info update route
router.put(
    '/business-info',
    authMiddleware,
    updateBusinessInfo
);

// Step 3: Bank Details
router.put(
    "/bank-details",
    authMiddleware,
    upload.single("cancelledCheque"), // field name from frontend form-data
    updateBankDetails
);

router.put(
    '/documents',
    authMiddleware,
    // Use .fields() to accept multiple, specific files
    // These names (e.g., 'gstCertificate') MUST match the form-data keys
    upload.fields([
        { name: 'gstCertificate', maxCount: 1 },
        { name: 'panCard', maxCount: 1 },
        { name: 'fssaiLicence', maxCount: 1 },
        { name: 'addressProof', maxCount: 1 },
        { name: 'additionalCertificate', maxCount: 1 } // For optional doc
    ]),
    updateDocuments
);

router.put(
    '/store-details',
    authMiddleware,
    updateStoreDetails
);

router.post('/login/password', loginWithPassword);

router.post('/login/otp-request', loginOtpRequest);

router.post('/login/otp-verify', loginOtpVerify);

router.get('/check-auth', authMiddleware, getCheckAuth);

router.post('/get-user', authMiddleware, getSellerFull)

router.get('/dashboard-metrics', authMiddleware, getDashboardMetrics);

module.exports = router;