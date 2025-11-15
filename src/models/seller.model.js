const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Schema = mongoose.Schema;

// --- Reusable Schemas for nested data ---

const AddressSchema = new Schema({
    addressLine1: { type: String, trim: true },
    addressLine2: { type: String, trim: true, default: null },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
}, { _id: false });

const DocumentUploadSchema = new Schema({
    docType: { type: String, required: true }, // e.g., 'GST', 'PAN', 'FSSAI'
    fileUrl: { type: String, required: true }, // This will be the Cloudinary URL
    fileName: { type: String },
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending',
    },
}, { _id: false });


// --- Main Seller Schema (All 5 Steps) ---

const SellerSchema = new Schema(
    {
        // --- Step 1: Personal Info ---
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        // --- Verification & Status ---
        emailVerified: {
            type: Boolean,
            default: false,
        },
        mobileNumber: {
            type: String,
            trim: true,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        alternateContact: {
            type: String,
            trim: true,
            default: null,
        },

        // --- Authentication & Status ---
        emailVerified: {
            type: Boolean,
            default: false,
        },
        otpHash: { type: String },
        otpExpiry: { type: Date },
        status: {
            type: String,
            enum: [
                'pending-email-verification',
                'pending-business-info',
                'pending-bank-details',
                'pending-documents',
                'pending-store-details',
                'pending-admin-approval', // Final check by admin
                'active',
                'suspended',
                'rejected',
            ],
            default: 'pending-email-verification',
        },

        // --- Step 2: Business Info ---
        businessInfo: {
            businessName: { type: String, trim: true },
            legalName: { type: String, trim: true },
            businessType: {
                type: String,
                enum: ['Proprietorship', 'Private Ltd', 'LLP', 'Partnership', 'Individual', null],
                default: null
            },
            gstNumber: { type: String, trim: true },
            panNumber: { type: String, trim: true },
            businessAddress: AddressSchema,
            businessContact: { type: String, trim: true },
            businessEmail: { type: String, trim: true, lowercase: true },
        },

        // --- Step 3: Bank Details ---
        bankDetails: {
            accountHolderName: { type: String, trim: true },
            bankName: { type: String, trim: true },
            branchName: { type: String, trim: true },
            accountNumber: { type: String, trim: true },
            ifscCode: { type: String, trim: true },
            cancelledChequeUrl: { type: String }, // Cloudinary URL
            verificationStatus: {
                type: String,
                enum: ['pending', 'verified'],
                default: 'pending',
            },
        },

        // --- Step 4: Documents ---
        documents: [DocumentUploadSchema], // Array of uploaded documents

        // --- Step 5: Store Details ---
        storeDetails: {
            storeName: { type: String, trim: true },
            storeAddress: AddressSchema,
            storeType: {
                type: String,
                enum: ['Warehouse', 'Retail', 'Dark Store', null],
                default: null
            },
            storeTimings: {
                open: { type: String, default: '09:00' },
                close: { type: String, default: '21:00' },
            },
            fssaiLicenceNumber: { type: String, trim: true },
            storeContactNumber: { type: String, trim: true },
            coveredDeliveryPincodes: [{ type: String, trim: true }],
            storePhotos: [{ type: String }], // Array of Cloudinary URLs
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt fields
    }
);

// --- Mongoose Middleware: Hash password before saving ---
SellerSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
        return next();
    }
    // Also hash the OTP if it's modified
    if (this.isModified('otpHash') && this.otpHash) {
        this.otpHash = await bcrypt.hash(this.otpHash, 10);
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// --- Mongoose Method: Compare password for login ---
SellerSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// --- Mongoose Method: Compare OTP for verification ---
SellerSchema.methods.compareOtp = async function (enteredOtp) {
    if (!this.otpHash) return false;
    return await bcrypt.compare(enteredOtp, this.otpHash);
};


const Seller = mongoose.model('Seller', SellerSchema);
module.exports = Seller;