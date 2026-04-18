const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { protect, sellerOnly } = require('../middleware/auth');

// All seller routes require login + seller role
router.use(protect, sellerOnly);

// ─────────────────────────────────────
// GET /api/seller/profile
// Returns seller's own profile (business + bank details)
// ─────────────────────────────────────
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────
// PUT /api/seller/profile
// Update business info, bank/UPI details, password
// Body: { businessName, gstNumber, businessState, upiId, bankAccount, password }
// ─────────────────────────────────────
router.put('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const {
      businessName, gstNumber, businessState,
      upiId, bankAccount, password, name, mobile
    } = req.body;

    if (name)          user.name          = name;
    if (mobile)        user.mobile        = mobile;
    if (businessName)  user.businessName  = businessName;
    if (gstNumber !== undefined)     user.gstNumber     = gstNumber;
    if (businessState) user.businessState = businessState;
    if (upiId !== undefined)         user.upiId         = upiId;
    if (bankAccount)   user.bankAccount   = bankAccount;

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
      }
      user.password = password; // pre-save hook hashes it
    }

    const updated = await user.save();

    res.json({
      message: 'Profile updated',
      user: {
        id:            updated._id,
        name:          updated.name,
        email:         updated.email,
        mobile:        updated.mobile,
        role:          updated.role,
        businessName:  updated.businessName,
        gstNumber:     updated.gstNumber,
        businessState: updated.businessState,
        upiId:         updated.upiId,
        bankAccount:   updated.bankAccount,
        sellerRating:  updated.sellerRating,
        totalReviews:  updated.totalReviews,
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────
// GET /api/seller/listings
// Query: status (approved|pending|rejected|draft), page, limit
// ─────────────────────────────────────
router.get('/listings', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { seller: req.user._id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    res.json({ products, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────
// POST /api/seller/listings
// ─────────────────────────────────────
router.post('/listings', async (req, res) => {
  try {
    const {
      name, category, description, brand, originState,
      price, mrp, stock, sku, weightGrams,
      images, variants, sizes,
      dispatchDays, returnPolicy,
      giTag, artisanBadge,
      emoji,
    } = req.body;

    if (!name || !category || !price || !mrp || !stock) {
      return res.status(400).json({ message: 'name, category, price, mrp and stock are required' });
    }
    if (price > mrp) {
      return res.status(400).json({ message: 'Selling price cannot exceed MRP' });
    }

    const discountPercent = Math.round(((mrp - price) / mrp) * 100);

    const product = await Product.create({
      seller:       req.user._id,
      name, category, description,
      brand:        brand || req.user.businessName,
      originState, price, mrp, discountPercent, stock, sku, weightGrams,
      images:       images || [],
      variants:     variants || [],
      sizes:        sizes   || [],
      dispatchDays: dispatchDays || '3-5 days',
      returnPolicy: returnPolicy || '7-day return',
      giTag, artisanBadge,
      emoji:        emoji || '📦',
      status:       'pending',
    });

    res.status(201).json({ message: 'Listing submitted for approval', product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────
// PUT /api/seller/listings/:id
// Edit own listing
// ─────────────────────────────────────
router.put('/listings/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, seller: req.user._id });
    if (!product) return res.status(404).json({ message: 'Listing not found' });

    const editableFields = [
      'name', 'category', 'description', 'brand', 'originState',
      'price', 'mrp', 'stock', 'sku', 'weightGrams',
      'images', 'variants', 'sizes',
      'dispatchDays', 'returnPolicy',
      'giTag', 'artisanBadge', 'emoji',
    ];

    editableFields.forEach(field => {
      if (req.body[field] !== undefined) product[field] = req.body[field];
    });

    if (req.body.price || req.body.mrp) {
      product.discountPercent = Math.round(((product.mrp - product.price) / product.mrp) * 100);
    }

    if (product.status === 'approved' || product.status === 'rejected') {
      product.status = 'pending';
    }

    await product.save();
    res.json({ message: 'Listing updated and re-queued for review', product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────
// PUT /api/seller/listings/:id/draft
// ─────────────────────────────────────
router.put('/listings/:id/draft', async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, seller: req.user._id });
    if (!product) return res.status(404).json({ message: 'Listing not found' });
    if (product.status === 'approved') {
      return res.status(400).json({ message: 'Cannot move an approved listing back to draft' });
    }

    Object.assign(product, req.body);
    product.status = 'draft';
    await product.save();

    res.json({ message: 'Saved as draft', product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────
// DELETE /api/seller/listings/:id
// ─────────────────────────────────────
router.delete('/listings/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, seller: req.user._id });
    if (!product) return res.status(404).json({ message: 'Listing not found' });
    if (product.status === 'approved') {
      return res.status(400).json({ message: 'Deactivate the listing before deleting' });
    }

    await product.deleteOne();
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────
// PUT /api/seller/listings/:id/deactivate
// ─────────────────────────────────────
router.put('/listings/:id/deactivate', async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, seller: req.user._id });
    if (!product) return res.status(404).json({ message: 'Listing not found' });

    product.status = 'draft';
    await product.save();
    res.json({ message: 'Listing deactivated', product });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────
// GET /api/seller/orders
// ─────────────────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { 'items.seller': req.user._id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('buyer', 'name email mobile'),
      Order.countDocuments(filter),
    ]);

    const filtered = orders.map(o => {
      const obj = o.toObject();
      obj.items = obj.items.filter(i => i.seller.toString() === req.user._id.toString());
      return obj;
    });

    res.json({ orders: filtered, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────
// GET /api/seller/analytics
// ─────────────────────────────────────
router.get('/analytics', async (req, res) => {
  try {
    const sellerId = req.user._id;

    const revAgg = await Order.aggregate([
      { $match: { 'items.seller': sellerId, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $match: { 'items.seller': sellerId } },
      { $group: { _id: null, totalRevenue: { $sum: '$items.subtotal' }, totalOrders: { $sum: 1 } } },
    ]);

    const { totalRevenue = 0, totalOrders = 0 } = revAgg[0] || {};

    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 6);
    sevenMonthsAgo.setDate(1);

    const monthlyAgg = await Order.aggregate([
      { $match: { 'items.seller': sellerId, status: { $ne: 'cancelled' }, createdAt: { $gte: sevenMonthsAgo } } },
      { $unwind: '$items' },
      { $match: { 'items.seller': sellerId } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$items.subtotal' }, orders: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const categoryAgg = await Order.aggregate([
      { $match: { 'items.seller': sellerId, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $match: { 'items.seller': sellerId } },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'productDoc' } },
      { $unwind: '$productDoc' },
      { $group: { _id: '$productDoc.category', revenue: { $sum: '$items.subtotal' }, orders: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
    ]);

    const catTotal = categoryAgg.reduce((s, c) => s + c.revenue, 0) || 1;
    const categoryBreakdown = categoryAgg.map(c => ({
      category: c._id, revenue: c.revenue, orders: c.orders,
      pct: Math.round((c.revenue / catTotal) * 100),
    }));

    const topProductsAgg = await Order.aggregate([
      { $match: { 'items.seller': sellerId, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $match: { 'items.seller': sellerId } },
      { $group: { _id: '$items.product', name: { $first: '$items.name' }, emoji: { $first: '$items.emoji' }, unitsSold: { $sum: '$items.quantity' }, revenue: { $sum: '$items.subtotal' } } },
      { $sort: { unitsSold: -1 } },
      { $limit: 5 },
    ]);

    const stateAgg = await Order.aggregate([
      { $match: { 'items.seller': sellerId, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$deliveryAddress.state', orders: { $sum: 1 } } },
      { $sort: { orders: -1 } },
      { $limit: 8 },
    ]);

    const kpiAgg = await Order.aggregate([
      { $match: { 'items.seller': sellerId } },
      { $group: { _id: '$buyer', orderCount: { $sum: 1 }, totalSpend: { $sum: '$totalAmount' }, returnedCount: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] } } } },
      { $group: { _id: null, uniqueBuyers: { $sum: 1 }, repeatBuyers: { $sum: { $cond: [{ $gt: ['$orderCount', 1] }, 1, 0] } }, totalReturned: { $sum: '$returnedCount' } } },
    ]);

    const kpi = kpiAgg[0] || { uniqueBuyers: 0, repeatBuyers: 0, totalReturned: 0 };
    const repeatRate  = kpi.uniqueBuyers ? Math.round((kpi.repeatBuyers / kpi.uniqueBuyers) * 100) : 0;
    const returnRate  = totalOrders ? parseFloat(((kpi.totalReturned / totalOrders) * 100).toFixed(1)) : 0;
    const avgOrderVal = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;

    res.json({
      summary: { totalRevenue, totalOrders, avgOrderValue: avgOrderVal, repeatBuyerPct: repeatRate, returnRatePct: returnRate, sellerRating: req.user.sellerRating, totalReviews: req.user.totalReviews },
      monthlyRevenue: monthlyAgg,
      categoryBreakdown,
      topProducts: topProductsAgg,
      ordersByState: stateAgg,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;