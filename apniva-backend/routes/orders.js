const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, sellerOnly } = require('../middleware/auth');

// ─────────────────────────────────────
// POST /api/orders
// Buyer places a new order
// Body: { items: [{productId, quantity, variant}], deliveryAddress, paymentMethod, promoCode }
// ─────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { items, deliveryAddress, paymentMethod, promoCode } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ message: 'No items in order' });
    }

    // Build order items — pull live price & seller from DB
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ message: `Product ${item.productId} not found` });
      if (product.status !== 'approved') return res.status(400).json({ message: `${product.name} is not available` });
      if (product.stock < item.quantity) return res.status(400).json({ message: `Insufficient stock for ${product.name}` });

      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;

      orderItems.push({
        product: product._id,
        seller:  product.seller,
        name:    product.name,
        emoji:   product.emoji,
        price:   product.price,
        quantity: item.quantity,
        variant:  item.variant || '',
        subtotal: lineTotal,
      });

      // Decrement stock
      product.stock -= item.quantity;
      await product.save();
    }

    // Promo code discount (flat 10% for APNIVA10)
    let discountAmount = 0;
    if (promoCode && promoCode.toUpperCase() === 'APNIVA10') {
      discountAmount = Math.round(subtotal * 0.1);
    }

    const deliveryCharge = subtotal >= 499 ? 0 : 49;
    const totalAmount = subtotal - discountAmount + deliveryCharge;

    const order = await Order.create({
      buyer:           req.user._id,
      items:           orderItems,
      deliveryAddress,
      paymentMethod:   paymentMethod || 'UPI',
      paymentStatus:   'paid',          // assume payment gateway confirms before hitting this route
      promoCode:       promoCode || '',
      discountAmount,
      subtotal,
      deliveryCharge,
      totalAmount,
    });

    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────
// GET /api/orders/my
// Buyer's own orders
// Query: status (optional filter), page, limit
// ─────────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { buyer: req.user._id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('items.product', 'name emoji category'),
      Order.countDocuments(filter),
    ]);

    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────
// GET /api/orders/:id
// Get single order — buyer or seller in the order
// ─────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyer', 'name email mobile')
      .populate('items.product', 'name emoji category images');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Allow buyer or any seller whose items are in this order
    const isBuyer    = order.buyer._id.toString() === req.user._id.toString();
    const isSeller   = order.items.some(i => i.seller.toString() === req.user._id.toString());

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────
// PUT /api/orders/:id/status
// Seller updates order status (confirmed → shipped → out_for_delivery → delivered)
// Body: { status, message, trackingNumber }
// ─────────────────────────────────────
router.put('/:id/status', protect, sellerOnly, async (req, res) => {
  try {
    const { status, message, trackingNumber } = req.body;

    const VALID = ['confirmed', 'shipped', 'out_for_delivery', 'delivered'];
    if (!VALID.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID.join(', ')}` });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Confirm this seller has items in the order
    const hasSeller = order.items.some(i => i.seller.toString() === req.user._id.toString());
    if (!hasSeller) return res.status(403).json({ message: 'Access denied' });

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;

    order.timeline.push({
      status,
      message: message || `Order ${status.replace(/_/g, ' ')}`,
    });

    await order.save();
    res.json({ message: 'Order status updated', order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────
// PUT /api/orders/:id/cancel
// Cancel an order — no role restriction (as requested)
// Restores stock. Only cancellable if not yet delivered.
// ─────────────────────────────────────
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status === 'delivered') {
      return res.status(400).json({ message: 'Delivered orders cannot be cancelled — raise a return instead' });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ message: 'Order already cancelled' });
    }

    // Restore stock for each item
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }

    order.status = 'cancelled';
    order.timeline.push({ status: 'cancelled', message: 'Order cancelled' });
    await order.save();

    res.json({ message: 'Order cancelled and stock restored', order });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;