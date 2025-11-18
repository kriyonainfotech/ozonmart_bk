const mongoose = require('mongoose');

// This model holds all the SHARED information for a product.
// Example: "Amul Butter" (Title)
// Variants (100g, 500g) are in the Variant model.

const ProductSchema = new mongoose.Schema(
    {
        // --- Core Links ---
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Seller',
            required: true,
            index: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Category is required'],
        },

        // --- Basic Details (from Doc) ---
        title: {
            type: String,
            required: [true, 'Product title is required'],
            trim: true,
        },
        brand: {
            type: String,
            required: [true, 'Brand name is required'],
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
        },
        shortDescription: {
            type: String,
        },
        tags: [String], // For search visibility

        // --- Images (from Doc) ---
        // We'll store an array of Cloudinary URLs
        images: {
            type: [String],
            validate: [v => v.length > 0, 'At least one product image is required']
        },

        // --- Attributes (from Doc) ---
        // These are often copied from the Category for consistency
        attributes: {
            fssaiNumber: String,
            origin: String,
            manufacturer: String,
            returnPolicy: String,
            customerCareInfo: String,
            expiryDate: Date, // Expiry for the *product line*
            // ... any other custom attributes
        },

        // --- Shipping Details (from Doc) ---
        shippingDetails: {
            weight: Number, // in grams
            length: Number, // in cm
            width: Number, // in cm
            height: Number, // in cm
            fragile: { type: Boolean, default: false },
            perishable: { type: Boolean, default: false },
        },

        // --- Taxation (from Doc) ---
        // These apply to all variants
        taxPercentage: {
            type: Number,
            default: 0,
        },
        hsnCode: {
            type: String,
        },

        // --- Status (from Doc) ---
        status: {
            type: String,
            enum: ['draft', 'pending-approval', 'published', 'rejected', 'archived'],
            default: 'draft',
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// // When a Product is deleted, we must also delete all its "Child" variants
ProductSchema.virtual('variants', {
    ref: 'Variant',
    localField: '_id',
    foreignField: 'product',
});


module.exports = mongoose.models.Product || mongoose.model("Product", ProductSchema);