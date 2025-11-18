const jwt = require('jsonwebtoken');
const Seller = require('../models/sellermodel');

/**
 * @desc    Middleware to protect routes by verifying JWT
 */
const authMiddleware = async (req, res, next) => {
    let token;

    // Check for authorization header and format "Bearer <token>"
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // 1. Get token from header
            token = req.headers.authorization.split(' ')[1];
            console.log("Auth Middleware: Checking authorization header", token);

            // 2. Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Get seller from DB and attach to req object
            // We exclude the password and OTP fields for security
            req.seller = await Seller.findById(decoded.id).select('-password -otpHash -otpExpiry');

            if (!req.seller) {
                return res.status(401).json({ message: 'Not authorized, seller not found' });
            }

            // 4. Proceed to the next function (the controller)
            next();
        } catch (error) {
            console.error('Token verification failed:', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    // If no token is found at all
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

module.exports = { authMiddleware };