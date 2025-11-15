const Category = require('../models/Category.model.js');
const Seller = require('../models/seller.model.js');

/**
 * @route   POST /api/v1/categories
 * @desc    Create a new category
 * @access  Private
 */
const createCategory = async (req, res) => {
    const { name, description, parentCategory, attributes } = req.body;
    const sellerId = req.seller.id; // From authMiddleware

    try {
        // Check if seller is active
        if (req.seller.status !== 'active') {
            return res.status(403).json({
                message: `Your account is not active. Current status: ${req.seller.status}`
            });
        }

        // Check if parent category exists and belongs to this seller (if provided)
        if (parentCategory) {
            const parent = await Category.findOne({ _id: parentCategory, seller: sellerId });
            if (!parent) {
                return res.status(404).json({ message: 'Parent category not found.' });
            }
        }

        const newCategory = new Category({
            name,
            description,
            parentCategory: parentCategory || null,
            attributes,
            seller: sellerId,
        });

        const savedCategory = await newCategory.save();
        res.status(201).json({
            success: true,
            message: 'Category created successfully.',
            category: savedCategory,
        });

    } catch (error) {
        console.error('Create Category Error:', error.message);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'You already have a category with this name.' });
        }
        res.status(500).json({ message: 'Server error creating category.' });
    }
};

/**
 * @route   GET /api/v1/categories
 * @desc    Get all categories for the logged-in seller
 * @access  Private
 */
const getMyCategories = async (req, res) => {
    const sellerId = req.seller.id;

    try {
        // Find all categories belonging to this seller
        const categories = await Category.find({ seller: sellerId })
            .populate('parentCategory', 'name') // Show parent category's name
            .sort({ createdAt: -1 }); // Show newest first

        res.status(200).json({
            success: true,
            count: categories.length,
            categories,
        });

    } catch (error) {
        console.error('Get Categories Error:', error.message);
        res.status(500).json({ message: 'Server error fetching categories.' });
    }
};

/**
 * @route   PUT /api/v1/categories/:id
 * @desc    Update a category
 * @access  Private
 */
const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description, parentCategory, attributes, status } = req.body;
    const sellerId = req.seller.id;

    try {
        let category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({ message: 'Category not found.' });
        }

        // Check if this seller owns the category
        if (category.seller.toString() !== sellerId) {
            return res.status(403).json({ message: 'Not authorized to update this category.' });
        }

        // Update fields
        category.name = name || category.name;
        category.description = description || category.description;
        category.parentCategory = parentCategory || category.parentCategory;
        category.attributes = attributes || category.attributes;
        category.status = status || category.status;

        const updatedCategory = await category.save();

        console.log('Updated Category:', updatedCategory);
        res.status(200).json({
            success: true,
            message: 'Category updated successfully.',
            category: updatedCategory,
        });

    } catch (error) {
        console.error('Update Category Error:', error.message);
        res.status(500).json({ message: 'Server error updating category.' });
    }
};

/**
 * @route   DELETE /api/v1/categories/:id
 * @desc    Delete a category
 * @access  Private
 */
const deleteCategory = async (req, res) => {
    const { id } = req.params;
    const sellerId = req.seller.id;

    try {
        const category = await Category.findById(id);

        if (!category) {
            return res.status(404).json({ message: 'Category not found.' });
        }

        // Check if this seller owns the category
        if (category.seller.toString() !== sellerId) {
            return res.status(403).json({ message: 'Not authorized to delete this category.' });
        }

        // TODO: Add check here to prevent deletion if products are using this category
        // For now, we just delete

        await category.deleteOne(); // Use deleteOne()

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully.',
        });

    } catch (error) {
        console.error('Delete Category Error:', error.message);
        res.status(500).json({ message: 'Server error deleting category.' });
    }
};


const getMyCategoryById = async (req, res) => {
    const { id } = req.params;
    const sellerId = req.seller.id;

    try {
        // Find category that belongs to this seller
        const category = await Category.findOne({ _id: id, seller: sellerId })
            .populate('parentCategory', 'name')
            .lean();

        if (!category) {
            return res.status(404).json({ message: 'Category not found.' });
        }

        res.status(200).json({
            success: true,
            category,
        });

    } catch (error) {
        console.error('Get Category By Id Error:', error.message);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid category id.' });
        }
        res.status(500).json({ message: 'Server error fetching category.' });
    }
};

module.exports.getMyCategoryById = getMyCategoryById;

module.exports = {
    createCategory,
    getMyCategories,
    updateCategory,
    deleteCategory,
    getMyCategoryById
};