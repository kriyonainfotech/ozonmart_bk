const Seller = require('../models/sellermodel.js');
const Product = require('../models/productmodel.js');
const Category = require('../models/categorymodel.js');
const Variant = require('../models/variantmodel.js');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const { sendOtpEmail } = require('../services/email.service.js');
const bcrypt = require('bcryptjs'); // make sure this is imported at the top

// --- Helper: Generate JWT ---
const generateToken = (sellerId, status) => {
    return jwt.sign(
        {
            id: sellerId,
            status: status // Include status to help frontend routing
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '30d', // Long expiry for seller convenience
        }
    );
};

// --- Helper: Generate 6-Digit OTP ---
const generateOtp = () => {
    return crypto.randomInt(100000, 999999).toString();
};

// --- Controller Functions ---

/**
 * @route   POST /api/v1/auth/register
 * @desc    Start registration, create user, send OTP
 * @access  Public
 */
const registerStart = async (req, res) => {
    // 1. Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, email, mobileNumber, password } = req.body;

    try {
        // 2. Check if user already exists and is verified
        let seller = await Seller.findOne({ email, emailVerified: true });

        const otp = generateOtp();
        const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        // 4. Hash password securely
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        if (seller) {
            // --- USER EXISTS ---
            // Case 1: User exists and is already fully verified
            if (seller.emailVerified) {
                return res.status(400).json({ message: 'A verified seller with this email already exists.' });
            }
            // Case 2: User exists but is pending verification.
            // We'll update their info and resend OTP.
            // This skips creating a new document.
            seller.fullName = fullName;
            seller.mobileNumber = mobileNumber;
            seller.password = password;
            seller.otpHash = otp; // Will be hashed by pre-save
            seller.otpExpiry = otpExpiry;
            seller.status = 'pending-email-verification';
            seller.emailVerified = false; // Ensure it's reset

            await seller.save(); // Triggers pre-save hook for password/OTP hashing
        } else {
            // --- NEW USER ---
            // Create a new seller document
            seller = new Seller({
                fullName,
                email,
                mobileNumber,
                password, // This will be hashed by the 'pre-save' hook
                otpHash: otp, // This will also be hashed by 'pre-save'
                otpExpiry,
                status: 'pending-email-verification',
                emailVerified: false,
            });

            await seller.save();
        }

        // 4. Find or Create Seller
        // We use upsert to handle cases where a user starts registration but doesn't verify.
        // They can re-trigger this API to get a new OTP.
        seller = await Seller.findOneAndUpdate(
            { email },
            {
                fullName,
                email,
                mobileNumber,
                password, // This will be hashed by the 'pre-save' hook in the model
                otpHash: hashedOtp, // This will also be hashed by 'pre-save'
                otpExpiry,
                status: 'pending-email-verification',
                emailVerified: false,
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );

        // 5. Send Email (Simulated)
        await sendOtpEmail({ to: email, fullName, otp });

        console.log(`--- DEV MODE: OTP for ${email} is ${otp} ---`);

        // 6. Send Response
        res.status(201).json({
            success: true,
            message: `OTP sent to ${email}. Please check your inbox (and spam folder).`
        });

    } catch (error) {
        console.error('Registration Error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email already in use.' });
        }
        res.status(500).json({ message: 'Server error during registration.' });
    }
};


/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email with OTP and issue JWT
 * @access  Public
 */
const verifyEmail = async (req, res) => {
    const { email, otp } = req.body;
    console.log("Verifying OTP for:", email, otp);

    if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    try {
        // 1. Find seller by email
        const seller = await Seller.findOne({ email });
        console.log("Verifying OTP for seller:", seller);

        if (!seller) {
            return res.status(404).json({ message: 'Seller not found.' });
        }

        // 2. Check current status
        if (seller.status !== 'pending-email-verification') {
            return res.status(400).json({ message: 'Email is already verified or in a different state.' });
        }

        // 3. Check OTP expiry
        if (seller.otpExpiry < new Date()) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        // 4. Check OTP validity
        const hashed = crypto.createHash('sha256').update(otp).digest('hex');
        const isMatch = seller.otpHash === hashed;
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid OTP.' });
        }

        // 5. SUCCESS: Update seller
        seller.emailVerified = true;
        seller.status = 'pending-business-info'; // Move to next step!
        seller.otpHash = undefined; // Clear OTP fields
        seller.otpExpiry = undefined;
        await seller.save({ validateBeforeSave: false }); // Skip validation as we are only updating

        // 6. Issue JWT
        const token = generateToken(seller._id, seller.status);

        res.status(200).json({
            success: true,
            message: 'Email verified successfully. You can now complete your profile.',
            token,
            seller: {
                id: seller._id,
                email: seller.email,
                fullName: seller.fullName,
                status: seller.status,
            }
        });

    } catch (error) {
        console.error('Email Verification Error:', error.message);
        res.status(500).json({ message: 'Server error during verification.' });
    }
};

const updateBusinessInfo = async (req, res) => {
    // 1. Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // 2. Get seller from req (attached by authMiddleware)
    // We use req.seller.id to find the *full* document to be safe
    try {
        const seller = await Seller.findById(req.seller.id);

        if (!seller) {
            return res.status(404).json({ message: 'Seller not found.' });
        }

        // 3. Check if they are on the right step
        if (seller.status !== 'pending-business-info') {
            return res.status(400).json({
                message: `Your account is not pending business info. Current status: ${seller.status}`
            });
        }

        // 4. Get data from request body
        const {
            businessName,
            legalName,
            businessType,
            gstNumber,
            panNumber,
            businessAddress, // This will be an object: { addressLine1, addressLine2, city, state, pincode }
            businessContact,
            businessEmail
        } = req.body;

        // 5. Update the businessInfo nested object
        seller.businessInfo = {
            businessName,
            legalName,
            businessType,
            gstNumber,
            panNumber,
            businessAddress,
            businessContact,
            businessEmail
        };

        // 6. Move seller to the NEXT step
        seller.status = 'pending-bank-details';

        // 7. Save the updated seller document
        await seller.save();

        // 8. Send success response
        res.status(200).json({
            success: true,
            message: 'Business information saved. Please proceed to bank details.',
            seller: {
                id: seller._id,
                status: seller.status,
                businessInfo: seller.businessInfo
            }
        });

    } catch (error) {
        console.error('Update Business Info Error:', error.message);
        res.status(500).json({ message: 'Server error updating business info.' });
    }
};

// /api/auth/bank-details
const updateBankDetails = async (req, res) => {
    // 1. Get seller from req (attached by authMiddleware)
    try {
        const seller = await Seller.findById(req.seller.id);

        if (!seller) {
            return res.status(404).json({ message: 'Seller not found.' });
        }

        // 2. Check if they are on the right step
        if (seller.status !== 'pending-bank-details') {
            return res.status(400).json({
                message: `Your account is not pending bank details. Current status: ${seller.status}`,
            });
        }

        // 3. Get data from request body        
        const {
            accountHolderName,
            bankName,
            branchName,
            accountNumber,
            ifscCode,
        } = req.body;

        console.log('Received bank details:', req.file, req.body);
        const cancelledChequeUrl = req.file?.path;

        if (!cancelledChequeUrl) {
            return res.status(400).json({ message: "Cancelled cheque image is required." });
        }
        // 4. Update the bankDetails nested object
        seller.bankDetails = {
            accountHolderName,
            bankName,
            branchName,
            accountNumber,
            ifscCode,
            cancelledChequeUrl,
            verificationStatus: "pending",
        };

        // 5. Move seller to the NEXT step
        seller.status = 'pending-documents';

        // 6. Save the updated seller document
        await seller.save();

        // 7. Send success response
        res.status(200).json({
            success: true,
            message: 'Bank details saved. Please proceed to document uploads.',
            seller: {
                id: seller._id,
                status: seller.status,
                bankDetails: seller.bankDetails,
            },
        });
    } catch (error) {
        console.error('Update Bank Details Error:', error.message);
        res.status(500).json({ message: 'Server error updating bank details.' });
    }
};

const updateDocuments = async (req, res) => {

    // Log everything multer parsed
    console.log("🧾 Multer Parsed Files:", req.files);

    // 1. Get seller from req (attached by authMiddleware)
    try {
        const seller = await Seller.findById(req.seller.id);

        if (!seller) {
            return res.status(404).json({ message: 'Seller not found.' });
        }

        // 2. Check if they are on the right step
        if (seller.status !== 'pending-documents') {
            return res.status(400).json({
                message: `Your account is not pending document submission. Current status: ${seller.status}`,
            });
        }

        const files = req.files;
        const documentsToSave = [];

        if (!files || Object.keys(files).length === 0) {
            return res.status(400).json({ message: 'At least one document file is required.' });
        }

        // 4. Map the req.files object to our schema array
        for (const key in files) {
            if (Object.hasOwnProperty.call(files, key)) {
                const fileArray = files[key]; // This is an array (even with maxCount: 1)
                const file = fileArray[0];    // Get the first file from the array

                // Create a "friendly name" for docType from the fieldname
                let docType = 'Other';
                if (key === 'gstCertificate') docType = 'GST Certificate';
                if (key === 'panCard') docType = 'PAN Card';
                if (key === 'fssaiLicence') docType = 'FSSAI Licence';
                if (key === 'addressProof') docType = 'Address Proof';
                if (key === 'additionalCertificate') docType = 'Additional Certificate';

                documentsToSave.push({
                    docType: docType,
                    fileUrl: file.path,       // This is the Cloudinary URL
                    fileName: file.filename,  // This is the unique filename from Cloudinary
                    verificationStatus: 'pending',
                });
            }
        }

        if (documentsToSave.length === 0) {
            return res.status(400).json({ message: 'No valid documents were processed.' });
        }

        // 5. Update the documents array (this replaces any existing docs)
        seller.documents = documentsToSave;

        // 6. Move seller to the NEXT step
        seller.status = 'pending-store-details';

        // 7. Save the updated seller document
        await seller.save();

        // 8. Send success response
        res.status(200).json({
            success: true,
            message: 'Documents saved. Please proceed to store details.',
            seller: {
                id: seller._id,
                status: seller.status,
                documents: seller.documents,
            },
        });
    } catch (error) {
        console.log('Update Documents Error:', error);
        res.status(500).json({ message: 'Server error updating documents.' });
    }
};

/**
 * @route   PUT /api/v1/seller/profile/store-details
 * @desc    Update seller's store details (Step 5)
 * @access  Private (Requires JWT)
 */
const updateStoreDetails = async (req, res) => {
    // 1. Get seller from req (attached by authMiddleware)
    try {
        const seller = await Seller.findById(req.seller.id);

        if (!seller) {
            return res.status(404).json({ message: 'Seller not found.' });
        }

        // 2. Check if they are on the right step
        if (seller.status !== 'pending-store-details') {
            return res.status(400).json({
                message: `Your account is not pending store details. Current status: ${seller.status}`,
            });
        }

        // 3. Get data from request body
        // Frontend is expected to handle validation
        const {
            storeName,
            storeAddress, // { addressLine1, city, state, pincode }
            storeType,
            storeTimings, // { open, close }
            fssaiLicenceNumber,
            storeContactNumber,
            coveredDeliveryPincodes, // [ "400001", "400002" ]
            storePhotos, // [ "http://.../img1.jpg", "http://.../img2.jpg" ]
        } = req.body;

        // 4. Update the storeDetails nested object
        seller.storeDetails = {
            storeName,
            storeAddress,
            storeType,
            storeTimings,
            fssaiLicenceNumber,
            storeContactNumber,
            coveredDeliveryPincodes,
            storePhotos,
        };

        // 5. FINAL STEP: Move seller to 'pending-admin-approval'
        // Their registration is now complete from their side.
        seller.status = 'active';

        // 6. Save the updated seller document
        await seller.save();

        // 🔥 Generate JWT token (same as login)
        const token = generateToken(seller._id);

        res.status(200).json({
            success: true,
            message: 'Registration complete!',
            id: seller._id,
            token, // <--- TOKEN ADDED HERE
            sellerStatus: seller.status,
            sellerDetails: seller.storeDetails,
        });

    } catch (error) {
        console.error('Update Store Details Error:', error.message);
        res.status(500).json({ message: 'Server error updating store details.' });
    }
};

// ===================================
// === ALL LOGIN APIS ARE BELOW ===
// ===================================

/**
 * @route   POST /api/v1/auth/login/password
 * @desc    Login seller with email and password
 * @access  Public
 */
const loginWithPassword = async (req, res) => {
    const { email, password } = req.body;
    console.log("Password Login Attempt for:", email, password);

    try {
        // 1. Find seller by email
        const seller = await Seller.findOne({ email });

        if (!seller) {
            return res.status(401).json({ message: 'Invalid credentials.' }); // Use generic message
        }

        // 2. Check if password matches
        // const isMatch = await seller.comparePassword(password);
        // // const isMatch = await bcrypt.compare(password, seller.password);
        // if (!isMatch) {
        //     return res.status(401).json({ message: 'Invalid credentials.' });
        // }

        // Direct comparison (plain text)
        if (seller.password !== password) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // 3. Check if email is verified (they can't log in if not)
        if (!seller.emailVerified) {
            return res.status(401).json({
                message: 'Email not verified. Please complete your registration verification.',
                // We can send a special status to frontend to handle this
                notVerified: true
            });
        }

        // 4. Generate JWT
        const token = generateToken(seller._id);

        // 5. Send response with token and seller status
        res.status(200).json({
            success: true,
            message: 'Logged in successfully.',
            token,
            sellerStatus: seller.status, // This is the "smart redirect" key
            sellerDetails: { // Pre-fill form data on frontend
                fullName: seller.fullName,
                businessInfo: seller.businessInfo,
                bankDetails: seller.bankDetails,
                storeDetails: seller.storeDetails
            }
        });

    } catch (error) {
        console.error('Password Login Error:', error.message);
        res.status(500).json({ message: 'Server error during login.' });
    }
};

/**
 * @route   POST /api/v1/auth/login/otp-request
 * @desc    Request an OTP for logging in
 * @access  Public
 */
const loginOtpRequest = async (req, res) => {
    const { email } = req.body;

    try {
        // 1. Find seller
        const seller = await Seller.findOne({ email });
        if (!seller) {
            return res.status(404).json({ message: 'No account found with this email.' });
        }

        // 2. Check verification status
        if (!seller.emailVerified) {
            return res.status(401).json({ message: 'This account is not verified. Please complete registration.' });
        }

        // 3. Generate and hash OTP
        const otp = generateOtp();
        const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // 4. Save hashed OTP + expiry in DB
        seller.otpHash = hashedOtp;
        seller.otpExpiry = otpExpiry;
        await seller.save();

        // 5. Send OTP email
        await sendOtpEmail({
            to: seller.email,
            name: seller.fullName,
            otp,
        });

        console.log(`--- DEV MODE: Login OTP for ${email} is ${otp} ---`);

        res.status(200).json({
            success: true,
            message: 'Login OTP sent to your email.',
        });

    } catch (error) {
        console.error('Login OTP Request Error:', error.message);
        res.status(500).json({ message: 'Server error sending OTP.' });
    }
};

/**
 * @route   POST /api/v1/auth/login/otp-verify
 * @desc    Verify OTP to log in
 * @access  Public
 */
const loginOtpVerify = async (req, res) => {
    const { email, otp } = req.body;
    console.log("Verifying OTP for:", email, otp);
    try {
        // 1. Find seller
        const seller = await Seller.findOne({ email });
        if (!seller) {
            return res.status(404).json({ message: 'Seller not found.' });
        }

        // 2. Check if OTP has expired
        if (seller.otpExpiry < Date.now()) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        // 3. Check if OTP matches
        const hashed = crypto.createHash('sha256').update(otp).digest('hex');
        const isMatch = seller.otpHash === hashed;
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid OTP.' });
        }

        // 4. Success! Clear OTP fields
        seller.otpHash = undefined;
        seller.otpExpiry = undefined;
        await seller.save();

        // 5. Generate JWT
        const token = generateToken(seller._id);

        // 6. Send response with token and seller status
        res.status(200).json({
            success: true,
            message: 'Logged in successfully.',
            token,
            sellerStatus: seller.status, // The "smart redirect" key
            sellerDetails: { // Pre-fill form data on frontend
                fullName: seller.fullName,
                businessInfo: seller.businessInfo,
                bankDetails: seller.bankDetails,
                storeDetails: seller.storeDetails
            }
        });

    } catch (error) {
        console.log('Login OTP Verify Error:', error);
        res.status(500).json({ message: 'Server error verifying login OTP.' });
    }
};


const getCheckAuth = async (req, res) => {
    try {
        const seller = await Seller.findById(req.seller.id).select('-password -otpHash -otpExpiry');
        if (!seller) {
            return res.status(404).json({ message: 'Seller not found.' });
        }
        res.status(200).json({
            success: true,
            seller
        });
    }
    catch (error) {
        console.error('Check Auth Error:', error.message);
        res.status(500).json({ message: 'Server error during authentication check.' });
    }
};

// GET /api/v1/seller/:id  or  GET /api/v1/seller?email=...  or authenticated GET /api/v1/seller/me
const getSellerFull = async (req, res) => {
    try {
        console.log('getSellerFull called. body:', req.body, 'query:', req.query, 'authSeller:', req.seller);

        const sellerId = req.seller.id
        const seller = await Seller.findById(sellerId);

        if (!seller) {
            console.warn('Seller not found for provided identifier.');
            return res.status(404).json({ message: 'Seller not found.' });
        }

        // Remove extremely sensitive fields before sending
        delete seller.password;
        delete seller.otpHash;
        delete seller.otpExpiry;

        console.log('Seller fetched successfully:', { id: seller._id, email: seller.email, status: seller.status });

        res.status(200).json({
            success: true,
            seller
        });
    } catch (error) {
        console.error('Get Seller Full Error:', error);
        res.status(500).json({ message: 'Server error fetching seller.' });
    }
};

const getDashboardMetrics = async (req, res) => {
    try {
        const sellerId = req.seller.id;

        // 1. Get Product & Category Counts
        const productCount = await Product.countDocuments({ seller: sellerId });
        const categoryCount = await Category.countDocuments({ seller: sellerId });

        // 2. Get Variant metrics (Total Stock, Out of Stock)
        const variantMetrics = await Variant.aggregate([
            {
                $match: { seller: new mongoose.Types.ObjectId(sellerId) }
            },
            {
                $group: {
                    _id: null,
                    totalStock: { $sum: '$stock' },
                    outOfStockItems: {
                        $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] }
                    }
                }
            }
        ]);

        const metrics = {
            productCount,
            categoryCount,
            totalStock: variantMetrics[0]?.totalStock || 0,
            outOfStockItems: variantMetrics[0]?.outOfStockItems || 0,
        };

        res.status(200).json({
            success: true,
            metrics,
        });

    } catch (error) {
        console.error('Get Dashboard Metrics Error:', error.message);
        res.status(500).json({ message: 'Server error fetching dashboard metrics.' });
    }
};

module.exports = {
    registerStart,
    verifyEmail,
    updateBusinessInfo,
    updateBankDetails,
    updateDocuments,
    updateStoreDetails,
    loginWithPassword,
    loginOtpRequest,
    loginOtpVerify,
    getCheckAuth,
    getSellerFull,
    getDashboardMetrics
};