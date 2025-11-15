const Seller = require('../models/seller.model');
// --- REMOVED: no longer needed for simple updates ---
// const { validationResult } = require('express-validator');

/**
 * @route   GET /api/v1/seller/profile
 * @desc    Get the logged-in seller's complete profile
 * @access  Private (Requires JWT)
 */
const getSellerProfile = async (req, res) => {
    try {
        // req.seller is attached by authMiddleware. We just send it.
        // The authMiddleware already selected *away* the password/OTP.
        if (!req.seller) {
            return res.status(404).json({ message: 'Seller not found.' });
        }

        res.status(200).json({
            success: true,
            seller: req.seller,
        });
    } catch (error) {
        console.error('Get Seller Profile Error:', error.message);
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
};

/**
 * @route   PUT /api/v1/seller/profile/personal
 * @desc    Update seller's personal info (Step 1)
 * @access  Private (Requires JWT)
 */
const updatePersonalDetails = async (req, res) => {
    try {
        const seller = await Seller.findById(req.seller.id);
        if (!seller) {
            return res.status(404).json({ message: 'Seller not found.' });
        }

        const { fullName, mobileNumber, alternateContact } = req.body;

        // Update fields
        seller.fullName = fullName || seller.fullName;
        seller.mobileNumber = mobileNumber || seller.mobileNumber;
        seller.alternateContact = alternateContact || seller.alternateContact;

        await seller.save();

        res.status(200).json({
            success: true,
            message: 'Personal details updated.',
            seller: {
                fullName: seller.fullName,
                mobileNumber: seller.mobileNumber,
                alternateContact: seller.alternateContact
            }
        });

    } catch (error) {
        console.error('Update Personal Details Error:', error.message);
        res.status(500).json({ message: 'Server error updating personal details.' });
    }
};


/**
 * @route   PUT /api/v1/seller/profile/business-info
 * @desc    Update seller's business info (Step 2)
 * @access  Private (Requires JWT)
 */
const updateBusinessInfo = async (req, res) => {
    // --- NO MORE VALIDATION ---
    // 1. Get seller from req (attached by authMiddleware)
    try {
        const seller = await Seller.findById(req.seller.id);

        if (!seller) {
            return res.status(404).json({ message: 'Seller not found.' });
        }

        // --- CRITICAL CHANGE: Status check removed ---
        // An active seller can update this any time.
        /*
        if (seller.status !== 'pending-business-info') {
          return res.status(400).json({ 
            message: `Your account is not pending business info. Current status: ${seller.status}` 
          });
        }
        */

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

        // 6. Move seller to the NEXT step (ONLY if they are in registration)
        if (seller.status === 'pending-business-info') {
            seller.status = 'pending-bank-details';
        }

        // 7. Save the updated seller document
        await seller.save();

        // 8. Send success response
        res.status(200).json({
            success: true,
            // --- Message changed to be more generic ---
            message: 'Business information updated.',
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

/**
 * @route   PUT /api/v1/seller/profile/bank-details
 * @desc    Update seller's bank details (Step 3)
 * @access  Private (Requires JWT)
 */
const updateBankDetails = async (req, res) => {
    try {
        const seller = await Seller.findById(req.seller.id);

        if (!seller) {
            return res.status(404).json({ message: 'Seller not found.' });
        }

        const {
            accountHolderName,
            bankName,
            branchName,
            accountNumber,
            ifscCode,
            cancelledChequeUrl, // optional (old method)
        } = req.body;

        // 🟦 If a file is uploaded, use its URL. (Cloudinary gives "path")
        let finalChequeUrl = cancelledChequeUrl;

        if (req.file) {
            finalChequeUrl = req.file.path;
        }

        seller.bankDetails = {
            accountHolderName,
            bankName,
            branchName,
            accountNumber,
            ifscCode,
            cancelledChequeUrl: finalChequeUrl,
            verificationStatus: "pending",
        };

        if (seller.status === "pending-bank-details") {
            seller.status = "pending-documents";
        }

        await seller.save();

        res.status(200).json({
            success: true,
            message: "Bank details updated.",
            seller: {
                id: seller._id,
                status: seller.status,
                bankDetails: seller.bankDetails,
            },
        });
    } catch (error) {
        console.error("Update Bank Details Error:", error.message);
        res.status(500).json({ message: "Server error updating bank details." });
    }
};


/**
 * @route   PUT /api/v1/seller/profile/documents
 * @desc    Update seller's uploaded documents (Step 4)
 * @access  Private (Requires JWT)
 */
const updateDocuments = async (req, res) => {
    // 1. Get seller from req (attached by authMiddleware)
    try {
        const seller = await Seller.findById(req.seller.id);

        if (!seller) {
            return res.status(404).json({ message: 'Seller not found.' });
        }

        // --- CRITICAL CHANGE: Status check removed ---
        /*
        if (seller.status !== 'pending-documents') {
          return res.status(400).json({
            message: `Your account is not pending document submission. Current status: ${seller.status}`,
          });
        }
        */

        // 3. Get documents array from request body
        // Frontend sends an array of objects:
        // [ { docType, fileUrl, fileName }, ... ]
        const { documents } = req.body;

        if (!documents || !Array.isArray(documents)) {
            return res.status(400).json({ message: 'A valid "documents" array is required.' });
        }

        // 4. Map to our schema and set verification to 'pending'
        const formattedDocuments = documents.map(doc => ({
            docType: doc.docType,
            fileUrl: doc.fileUrl,
            fileName: doc.fileName || 'Untitled',
            verificationStatus: 'pending' // Always reset to pending on new submission
        }));

        // 5. Update the documents array
        seller.documents = formattedDocuments;

        // 6. Move seller to the NEXT step (ONLY if they are in registration)
        if (seller.status === 'pending-documents') {
            seller.status = 'pending-store-details';
        }

        // 7. Save the updated seller document
        await seller.save();

        // 8. Send success response
        res.status(200).json({
            success: true,
            message: 'Documents updated.',
            seller: {
                id: seller._id,
                status: seller.status,
                documents: seller.documents,
            },
        });
    } catch (error) {
        console.error('Update Documents Error:', error.message);
        res.status(500).json({ message: 'Server error updating documents.' });
    }
}


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

        // --- CRITICAL CHANGE: Status check removed ---
        /*
        if (seller.status !== 'pending-store-details') {
          return res.status(400).json({
            message: `Your account is not pending store details. Current status: ${seller.status}`,
          });
        }
        */

        // 3. Get data from request body
        const {
            storeName,
            storeAddress, // { addressLine1, city, state, pincode }
            storeType,    // 'Warehouse', 'Retail', 'Dark Store'
            storeTimings, // { open, close }
            fssaiLicenceNumber,
            storeContactNumber,
            coveredDeliveryAreas, // ['pincode1', 'pincode2']
            storePhotos, // ['url1', 'url2']
        } = req.body;

        // 4. Update the storeDetails nested object
        seller.storeDetails = {
            storeName,
            storeAddress,
            storeType,
            storeTimings,
            fssaiLicenceNumber,
            storeContactNumber,
            coveredDeliveryAreas,
            storePhotos,
        };

        // 5. Move seller to the FINAL step (ONLY if they are in registration)
        if (seller.status === 'pending-store-details') {
            seller.status = 'pending-admin-approval';
        }

        // 6. Save the updated seller document
        await seller.save();

        // 7. Send success response
        res.status(200).json({
            success: true,
            message: 'Store details updated.',
            seller: {
                id: seller._id,
                status: seller.status,
            },
        });
    } catch (error) {
        console.error('Update Store Details Error:', error.message);
        res.status(500).json({ message: 'Server error updating store details.' });
    }
};


module.exports = {
    getSellerProfile, // <-- NEW
    updatePersonalDetails, // <-- NEW
    updateBusinessInfo,
    updateBankDetails,
    updateDocuments,
    updateStoreDetails, // Export the new function
};