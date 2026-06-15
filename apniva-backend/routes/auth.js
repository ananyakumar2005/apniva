const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Helper: generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// ─────────────────────────────────────
// POST /api/auth/register
// Body: { name, email, mobile, password, role, businessName, gstNumber, businessState }
// ─────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const {
      name, email, mobile, password, role,
      businessName, gstNumber, businessState
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Build user object
    const userData = { name, email, mobile, password, role: role || 'customer' };

    // Add seller fields if registering as seller
    if (role === 'seller') {
      if (!businessName) {
        return res.status(400).json({ message: 'Business name is required for sellers' });
      }
      userData.businessName = businessName;
      userData.gstNumber    = gstNumber;
      userData.businessState = businessState;
    }

    const user = await User.create(userData);

    res.status(201).json({
      message: 'Account created successfully',
      token: generateToken(user._id),
      user: {
        id:           user._id,
        name:         user.name,
        email:        user.email,
        role:         user.role,
        businessName: user.businessName || null
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────
// POST /api/auth/login
// Body: { email, password, role }
// ─────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check role matches (optional guard)
    if (role && user.role !== role) {
      return res.status(403).json({
        message: `This account is registered as a ${user.role}, not a ${role}`
      });
    }

    res.json({
      message: 'Login successful',
      token: generateToken(user._id),
      user: {
        id:           user._id,
        name:         user.name,
        email:        user.email,
        mobile:       user.mobile,
        role:         user.role,
        businessName: user.businessName || null,
        sellerRating: user.sellerRating || null
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────
// GET /api/auth/profile
// Headers: Authorization: Bearer <token>
// ─────────────────────────────────────
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────
// PUT /api/auth/profile
// Update name, mobile, addresses
// ─────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    user.name   = req.body.name   || user.name;
    user.mobile = req.body.mobile || user.mobile;

    if (req.body.addresses) {
      user.addresses = req.body.addresses;
    }

    // Only update password if provided
    if (req.body.password) {
      user.password = req.body.password; // pre-save hook will hash it
    }

    const updated = await user.save();

    res.json({
      message: 'Profile updated',
      user: {
        id:     updated._id,
        name:   updated.name,
        email:  updated.email,
        mobile: updated.mobile,
        role:   updated.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;