const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Category name is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        // This links to the seller who owns this category
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Seller',
            required: true,
        },
        // For sub-categories
        parentCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: null, // null means it's a top-level category
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        // As per your doc: "reusable values"
        // We store these as a flexible object
        attributes: {
            fssaiLicenceNumber: String,
            returnPolicy: String,
            origin: String,
            customerCareEmail: String,
            customerCarePhone: String,
            manufacturerName: String,
            expiryDateRequired: { type: Boolean, default: false },
            productWarrantyInfo: String,
            // We can add more custom fields here
        },
    },
    {
        timestamps: true,
    }
);

// Ensure a seller cannot have two categories with the same name
CategorySchema.index({ name: 1, seller: 1 }, { unique: true });

module.exports = mongoose.models.Category || mongoose.model("Category", CategorySchema);
