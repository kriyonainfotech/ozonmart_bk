const Variant = require('../models/variantmodel.js');
const Product = require('../models/productmodel.js');

/**
 * @route   PUT /api/v1/variants/:id
 * @desc    Update a single variant (price, stock, etc.)
 * @access  Private
 */
const updateVariant = async (req, res) => {
    // This is the API you'll use most often (e.g., updating stock)
    try {
        const { id } = req.params;
        const { ...updateData } = req.body;

        // Find by variant ID and seller ID
        const updatedVariant = await Variant.findOneAndUpdate(
            { _id: id, seller: req.seller.id },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedVariant) {
            return res.status(404).json({ message: 'Variant not found or not authorized.' });
        }

        // If stock is 0, set status to outOfStock
        if (updatedVariant.stock === 0 && updatedVariant.status !== 'outOfStock') {
            updatedVariant.status = 'outOfStock';
            await updatedVariant.save();
        }

        res.status(200).json({
            success: true,
            message: 'Variant updated.',
            variant: updatedVariant,
        });
    } catch (error) {
        console.error('Update Variant Error:', error.message);
        res.status(500).json({ message: 'Server error updating variant.' });
    }
};

/**
 * @route   POST /api/v1/variants
 * @desc    Add a new variant to an existing product
 * @access  Private
 */
const addVariantToProduct = async (req, res) => {
    try {
        const { productId, ...variantData } = req.body;
        const sellerId = req.seller.id;

        // 1. Check if the parent product exists and belongs to this seller
        const product = await Product.findOne({ _id: productId, seller: sellerId });
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        // 2. Create the new variant
        const newVariant = new Variant({
            ...variantData,
            product: productId,
            seller: sellerId,
        });

        const savedVariant = await newVariant.save();

        res.status(201).json({
            success: true,
            message: 'Variant added to product.',
            variant: savedVariant,
        });
    } catch (error) {
        console.error('Add Variant Error:', error.message);
        if (error.code === 11000) {
            return res.status(400).json({ message: `A variant with this SKU or name already exists for this product.` });
        }
        res.status(500).json({ message: 'Server error adding variant.' });
    }
};

/**
 * @route   DELETE /api/v1/variants/:id
 * @desc    Delete a single variant
 * @access  Private
 */
const deleteVariant = async (req, res) => {
    try {
        const { id } = req.params;

        const variant = await Variant.findOne({ _id: id, seller: req.seller.id });
        if (!variant) {
            return res.status(404).json({ message: 'Variant not found.' });
        }

        // Check if this is the last variant for the product
        const count = await Variant.countDocuments({ product: variant.product });
        if (count <= 1) {
            return res.status(400).json({
                message: 'Cannot delete the last variant. Delete the main product instead.'
            });
        }

        await variant.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Variant deleted successfully.',
        });
    } catch (error) {
        console.error('Delete Variant Error:', error.message);
        res.status(500).json({ message: 'Server error deleting variant.' });
    }
};

module.exports = {
    updateVariant,
    addVariantToProduct,
    deleteVariant,
};