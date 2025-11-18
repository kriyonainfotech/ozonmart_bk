const Product = require('../models/productmodel.js');
const Variant = require('../models/variantmodel.js');
const Category = require('../models/categorymodel.js');
const mongoose = require('mongoose');

/**
 * @route   POST /api/v1/products
 * @desc    Create a new product with variants
 * @access  Private
 */
// const createProduct = async (req, res) => {
//     // This is the "transactional" API
//     // It expects a full JSON object with the "Parent" product details
//     // and a "variants" array of "Child" variant objects.
//     console.log("Create Product Request Body:", req.body);

//     let {
//         categoryId, title, brand, description, shortDescription, tags,
//         images, attributes, shippingDetails, taxPercentage, hsnCode,
//         status, variants // 'variants' is a JSON string from FormData
//     } = req.body;

//     // Parse fields that come as JSON strings
//     if (variants && typeof variants === 'string') {
//         try {
//             variants = JSON.parse(variants);
//         } catch (err) {
//             variants = [];
//         }
//     }

//     if (attributes && typeof attributes === 'string') {
//         try {
//             attributes = JSON.parse(attributes);
//         } catch (err) {
//             attributes = {};
//         }
//     }

//     if (shippingDetails && typeof shippingDetails === 'string') {
//         try {
//             shippingDetails = JSON.parse(shippingDetails);
//         } catch (err) {
//             shippingDetails = {};
//         }
//     }

//     if (tags && typeof tags === 'string') {
//         tags = tags.split(',').map(t => t.trim());
//     }

//     const sellerId = req.seller.id;

//     // Start a MongoDB session for a transaction
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         // 1. Check if seller is active
//         if (req.seller.status !== 'active') {
//             await session.abortTransaction();
//             return res.status(403).json({
//                 message: `Your account is not active. Current status: ${req.seller.status}`
//             });
//         }

//         // 2. Validate Category
//         const category = await Category.findOne({ _id: categoryId, seller: sellerId }).session(session);
//         if (!category) {
//             await session.abortTransaction();
//             return res.status(404).json({ message: 'Category not found.' });
//         }

//         // 3. Validate Variants array
//         if (!variants || !Array.isArray(variants) || variants.length === 0) {
//             await session.abortTransaction();
//             return res.status(400).json({ message: 'At least one variant is required.' });
//         }

//         // 4. Create the "Parent" Product
//         const newProduct = new Product({
//             seller: sellerId,
//             category: categoryId,
//             title, brand, description, shortDescription, tags,
//             images,
//             attributes, // In a real app, you might merge this with category.attributes
//             shippingDetails,
//             taxPercentage, hsnCode,
//             status: status || 'published',
//         });

//         const savedProduct = await newProduct.save({ session });
//         const productId = savedProduct._id;

//         // 5. Create the "Child" Variants
//         const variantDocs = variants.map(variant => ({
//             ...variant,
//             product: productId, // Link to the new parent
//             seller: sellerId,   // Add seller for easy lookup
//         }));

//         const savedVariants = await Variant.insertMany(variantDocs, { session });

//         // 6. If all is good, commit the transaction
//         await session.commitTransaction();

//         res.status(201).json({
//             success: true,
//             message: 'Product created successfully.',
//             product: savedProduct,
//             variants: savedVariants,
//         });

//     } catch (error) {
//         // If anything fails, roll back all database changes
//         await session.abortTransaction();
//         console.error('Create Product Error:', error.message);
//         if (error.code === 11000) {
//             return res.status(400).json({ message: `A variant with this SKU or name already exists: ${error.message}` });
//         }
//         res.status(500).json({ message: 'Server error creating product.' });
//     } finally {
//         session.endSession();
//     }
// };

const createProduct = async (req, res) => {
    console.log("Create Product Request Body:", req.body);
    console.log("Uploaded Files:", req.files);

    const sellerId = req.seller.id;

    // Start MongoDB session
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // --- Parse incoming data ---
        const {
            categoryId,
            title,
            brand,
            description,
            shortDescription,
            tags,
            existingImages,
            attributes,
            shippingDetails,
            taxPercentage,
            hsnCode,
            status,
            variants // JSON string from frontend
        } = req.body;

        // Parse JSON fields
        const parsedVariants = variants ? JSON.parse(variants) : [];
        const parsedAttributes = attributes ? JSON.parse(attributes) : {};
        const parsedShipping = shippingDetails ? JSON.parse(shippingDetails) : {};
        const parsedExistingImages = existingImages ? JSON.parse(existingImages) : [];

        // --- Validate category ---
        const category = await Category.findOne({ _id: categoryId, seller: sellerId }).session(session);
        if (!category) {
            await session.abortTransaction();
            return res.status(404).json({ message: "Category not found." });
        }

        // --- Validate variants ---
        if (!parsedVariants || parsedVariants.length === 0) {
            await session.abortTransaction();
            return res.status(400).json({ message: "At least one variant is required." });
        }

        // --- Handle images ---
        let uploadedImages = [];
        if (req.files && req.files.length > 0) {
            uploadedImages = req.files.map(file => file.path); // Or file.secure_url for Cloudinary
        }

        const allImages = [...parsedExistingImages, ...uploadedImages];
        if (!allImages || allImages.length === 0) {
            await session.abortTransaction();
            return res.status(400).json({ message: "At least one product image is required." });
        }

        // --- Create Parent Product ---
        const newProduct = new Product({
            seller: sellerId,
            category: categoryId,
            title,
            brand,
            description,
            shortDescription,
            tags: typeof tags === "string" ? tags.split(",") : tags,
            images: allImages,
            attributes: parsedAttributes,
            shippingDetails: parsedShipping,
            taxPercentage,
            hsnCode,
            status: status || "published",
        });

        const savedProduct = await newProduct.save({ session });
        const productId = savedProduct._id;

        // --- Create Child Variants ---
        const variantDocs = parsedVariants.map(v => ({
            ...v,
            product: productId,
            seller: sellerId,
        }));

        const savedVariants = await Variant.insertMany(variantDocs, { session });

        // --- Commit Transaction ---
        await session.commitTransaction();
        res.status(201).json({
            success: true,
            message: "Product created successfully.",
            product: savedProduct,
            variants: savedVariants,
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("Create Product Error:", error.message);
        if (error.code === 11000) {
            return res.status(400).json({ message: `Duplicate variant SKU or name: ${error.message}` });
        }
        res.status(500).json({ message: "Server error creating product." });
    } finally {
        session.endSession();
    }
};

/**
 * @route   GET /api/v1/products
 * @desc    Get all products for the seller (without variants)
 * @access  Private
 */
const getMyProducts = async (req, res) => {
    try {
        const products = await Product.find({ seller: req.seller.id })
            .populate('category', 'name')
            .populate({
                path: 'variants',
                options: { sort: { createdAt: -1 } }
            })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: products.length,
            products,
        });
    } catch (error) {
        console.error('Get My Products Error:', error.message);
        res.status(500).json({ message: 'Server error fetching products.' });
    }
};

/**
 * @route   GET /api/v1/products/:id
 * @desc    Get a single product AND its variants
 * @access  Private
 */
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findOne({ _id: id, seller: req.seller.id })
            .populate('category', 'name attributes');

        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        // Now find all "Child" variants
        const variants = await Variant.find({ product: id, seller: req.seller.id });

        res.status(200).json({
            success: true,
            product,
            variants,
        });
    } catch (error) {
        console.error('Get Product By ID Error:', error.message);
        res.status(500).json({ message: 'Server error fetching product details.' });
    }
};

/**
 * @route   PUT /api/v1/products/:id
 * @desc    Update a "Parent" product's details
 * @access  Private
 */
// const updateProduct = async (req, res) => {
//     // This only updates the "Parent" info (title, description, etc.)
//     // Variant info (price/stock) is updated via the /variants/:id route
//     try {
//         const { id } = req.params;
//         const { ...updateData } = req.body;

//         const updatedProduct = await Product.findOneAndUpdate(
//             { _id: id, seller: req.seller.id }, // Find by ID and seller
//             { $set: updateData }, // Apply updates
//             { new: true, runValidators: true } // Return new doc and run schema validation
//         );

//         if (!updatedProduct) {
//             return res.status(404).json({ message: 'Product not found or not authorized.' });
//         }

//         res.status(200).json({
//             success: true,
//             message: 'Product updated.',
//             product: updatedProduct,
//         });
//     } catch (error) {
//         console.error('Update Product Error:', error.message);
//         res.status(500).json({ message: 'Server error updating product.' });
//     }
// };

const updateProduct = async (req, res) => {
    // This only updates the "Parent" info (title, description, etc.)
    // Variant info (price/stock) is updated via the /variants/:id route
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // --- Parse JSON strings if they came as strings ---
        if (typeof updateData.images === 'string') {
            try {
                updateData.images = JSON.parse(updateData.images);
            } catch (err) {
                updateData.images = []; // fallback
            }
        }

        if (typeof updateData.attributes === 'string') {
            try {
                updateData.attributes = JSON.parse(updateData.attributes);
            } catch (err) {
                updateData.attributes = {};
            }
        }

        if (typeof updateData.shippingDetails === 'string') {
            try {
                updateData.shippingDetails = JSON.parse(updateData.shippingDetails);
            } catch (err) {
                updateData.shippingDetails = {};
            }
        }

        if (typeof updateData.variants === 'string') {
            try {
                updateData.variants = JSON.parse(updateData.variants);
            } catch (err) {
                updateData.variants = [];
            }
        }

        const updatedProduct = await Product.findOneAndUpdate(
            { _id: id, seller: req.seller.id }, // Find by ID and seller
            { $set: updateData }, // Apply updates
            { new: true, runValidators: true } // Return new doc and run schema validation
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found or not authorized.' });
        }

        res.status(200).json({
            success: true,
            message: 'Product updated successfully.',
            product: updatedProduct,
        });
    } catch (error) {
        console.error('Update Product Error:', error.message);
        res.status(500).json({ message: 'Server error updating product.' });
    }
};


/**
 * @route   DELETE /api/v1/products/:id
 * @desc    Delete a product AND all its variants
 * @access  Private
 */
const deleteProduct = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { id } = req.params;

        const product = await Product.findOne({ _id: id, seller: req.seller.id }).session(session);
        if (!product) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Product not found.' });
        }

        // Using `product.remove()` will trigger the `pre('remove')` hook
        // in the Product model, which deletes all child variants.
        await product.remove({ session });

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Product and all its variants deleted.',
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Delete Product Error:', error.message);
        res.status(500).json({ message: 'Server error deleting product.' });
    } finally {
        session.endSession();
    }
};

module.exports = {
    createProduct,
    getMyProducts,
    getProductById,
    updateProduct,
    deleteProduct,
};