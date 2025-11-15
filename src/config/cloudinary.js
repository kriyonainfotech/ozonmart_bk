const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

// ✅ Initialize Cloudinary globally
// (Make sure these are in your .env file)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Flexible Multer storage
const storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
        // This function runs for every file uploaded
        const sellerId = req.seller?.id || 'unknown_seller';
        const folder = `seller_docs/${sellerId}`;

        // Use the file's 'fieldname' (e.g., 'cancelledCheque', 'panCard')
        // to create a unique and descriptive public_id
        const public_id = `${file.fieldname}-${sellerId}-${Date.now()}`;

        return {
            folder: folder,
            allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
            public_id: public_id,
        };
    },
});

// ✅ Export a single, configured multer instance
const upload = multer({ storage });

module.exports = { cloudinary, upload };