const mongoose = require('mongoose');

// This model holds the SPECIFIC info for each purchasable item.
// Example: "500g" (Name)
// It is the "Child" of a "Product"

const VariantSchema = new mongoose.Schema(
    {
        // --- Core Links ---
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
            index: true,
        },
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Seller',
            required: true,
            index: true,
        },

        // --- Variant Details (from Doc) ---
        name: {
            type: String,
            required: [true, 'Variant name is required (e.g., "500g", "1L")'],
            trim: true,
        },
        sku: {
            type: String,
            trim: true,
            unique: true,
            sparse: true, // <-- IMPORTANT!
            default: null
        },
        barcode: {
            type: String,
            trim: true,
        },

        // --- Pricing (from Doc) ---
        mrp: {
            type: Number,
            required: [true, 'MRP is required'],
        },
        sellingPrice: {
            type: Number,
            required: [true, 'Selling Price is required'],
            validate: [
                function (value) {
                    return value <= this.mrp;
                },
                'Selling price must be less than or equal to MRP',
            ],
        },

        // --- Inventory (from Doc) ---
        stock: {
            type: Number,
            required: [true, 'Stock quantity is required'],
            default: 0,
        },
        leadTime: {
            type: String, // e.g., "2-3 days"
        },

        // --- Status (from Doc) ---
        status: {
            type: String,
            enum: ['active', 'inactive', 'outOfStock'],
            default: 'active',
        },
    },
    {
        timestamps: true,
        // Auto-calculate discount
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual property to auto-calculate discount percentage
VariantSchema.virtual('discount').get(function () {
    if (this.mrp > 0 && this.sellingPrice < this.mrp) {
        return Math.round(((this.mrp - this.sellingPrice) / this.mrp) * 100);
    }
    return 0;
});

// A product can't have two variants with the same name
VariantSchema.index({ product: 1, name: 1 }, { unique: true });

module.exports = mongoose.models.Variant || mongoose.model("Variant", VariantSchema);
