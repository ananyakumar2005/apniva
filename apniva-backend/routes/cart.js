const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, customerOnly } = require('../middleware/auth');

// All cart routes require login + customer role
router.use(protect, customerOnly);

// GET /api/cart
router.get('/', async (req, res) => {
  try {
    const user = await req.user.populate({
      path: 'cart.product',
      select: 'name emoji price mrp discount brand category stock status'
    });

    const items = user.cart
      .filter(i => i.product && i.product.status === 'approved')
      .map(i => ({
        product:  i.product._id,
        name:     i.product.name,
        emoji:    i.product.emoji,
        price:    i.product.price,
        mrp:      i.product.mrp,
        discount: i.product.discount,
        brand:    i.product.brand,
        category: i.product.category,
        stock:    i.product.stock,
        qty:      i.qty,
        subtotal: i.product.price * i.qty,
      }));

    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const savings  = items.reduce((s, i) => s + (i.mrp - i.price) * i.qty, 0);

    res.json({
      items,
      subtotal,
      savings,
      deliveryCharge: subtotal >= 499 ? 0 : 49,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/cart/add
// Body: { productId, qty }
router.post('/add', async (req, res) => {
  try {
    const { productId, qty = 1 } = req.body;

    const product = await Product.findById(productId);
    if (!product || product.status !== 'approved') {
      return res.status(404).json({ message: 'Product not found or unavailable' });
    }
    if (product.stock < qty) {
      return res.status(400).json({ message: `Only ${product.stock} units in stock` });
    }

    const user = req.user;
    const existing = user.cart.find(i => i.product.toString() === productId);

    if (existing) {
      existing.qty = Math.min(existing.qty + qty, product.stock);
    } else {
      user.cart.push({ product: productId, qty });
    }

    await user.save();
    res.json({
      message:   'Added to cart',
      cartCount: user.cart.reduce((s, i) => s + i.qty, 0),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/cart/update
// Body: { productId, qty } — qty=0 removes the item
router.put('/update', async (req, res) => {
  try {
    const { productId, qty } = req.body;
    const user = req.user;

    if (qty <= 0) {
      user.cart = user.cart.filter(i => i.product.toString() !== productId);
    } else {
      const item = user.cart.find(i => i.product.toString() === productId);
      if (!item) return res.status(404).json({ message: 'Item not in cart' });

      const product = await Product.findById(productId).select('stock');
      item.qty = Math.min(qty, product.stock);
    }

    await user.save();
    res.json({
      message:   'Cart updated',
      cartCount: user.cart.reduce((s, i) => s + i.qty, 0),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/cart/remove/:productId
router.delete('/remove/:productId', async (req, res) => {
  try {
    const user = req.user;
    user.cart = user.cart.filter(i => i.product.toString() !== req.params.productId);
    await user.save();
    res.json({
      message:   'Item removed',
      cartCount: user.cart.reduce((s, i) => s + i.qty, 0),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/cart/clear
router.delete('/clear', async (req, res) => {
  try {
    req.user.cart = [];
    await req.user.save();
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;