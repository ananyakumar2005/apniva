const express = require('express');
const router = express.Router();
const Payout = require('../models/Payout');
const Order  = require('../models/Order');
const { protect, sellerOnly } = require('../middleware/auth');

router.use(protect, sellerOnly);

// ─────────────────────────────────────
// Shared helper: compute a seller's current balance
// Available  = sum of delivered orders in settled periods − already paid out
// Pending    = sum of delivered orders NOT yet in any payout
// ─────────────────────────────────────
async function computeBalance(sellerId) {
  const PLATFORM_FEE_PCT = 0.05; // 5% commission

  // All delivered order revenue for this seller
  const revenueAgg = await Order.aggregate([
    { $match: { 'items.seller': sellerId, status: 'delivered' } },
    { $unwind: '$items' },
    { $match: { 'items.seller': sellerId } },
    { $group: { _id: null, gross: { $sum: '$items.subtotal' } } },
  ]);
  const grossEarned = revenueAgg[0]?.gross || 0;

  // Total already paid out
  const paidAgg = await Payout.aggregate([
    { $match: { seller: sellerId, status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$netAmount' } } },
  ]);
  const totalPaidOut = paidAgg[0]?.total || 0;

  // Orders not yet included in any payout (delivered in last 7 days = pending clearance)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const pendingAgg = await Order.aggregate([
    {
      $match: {
        'items.seller': sellerId,
        status: 'delivered',
        updatedAt: { $gte: sevenDaysAgo },
      },
    },
    { $unwind: '$items' },
    { $match: { 'items.seller': sellerId } },
    { $group: { _id: null, gross: { $sum: '$items.subtotal' } } },
  ]);
  const pendingGross = pendingAgg[0]?.gross || 0;

  const net = (amount) => Math.round(amount * (1 - PLATFORM_FEE_PCT));

  return {
    available: net(grossEarned) - totalPaidOut,
    pending:   net(pendingGross),
    totalPaidOut,
  };
}

// ─────────────────────────────────────
// GET /api/payouts/balance
// Returns available, pending, total paid out
// ─────────────────────────────────────
router.get('/balance', async (req, res) => {
  try {
    const balance = await computeBalance(req.user._id);
    res.json(balance);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────
// GET /api/payouts
// Payout history for this seller
// Query: status, page, limit
// ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { seller: req.user._id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [payouts, total] = await Promise.all([
      Payout.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Payout.countDocuments(filter),
    ]);

    res.json({ payouts, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────
// POST /api/payouts/withdraw
// Seller requests a manual withdrawal of available balance
// Body: { bankAccount } or { upiId }
// In production a cron would do this automatically weekly;
// this endpoint lets the seller pull early.
// ─────────────────────────────────────
router.post('/withdraw', async (req, res) => {
  try {
    const { bankAccount, upiId } = req.body;

    if (!bankAccount && !upiId) {
      return res.status(400).json({ message: 'Provide bankAccount or upiId' });
    }

    const balance = await computeBalance(req.user._id);

    if (balance.available <= 0) {
      return res.status(400).json({ message: 'No available balance to withdraw' });
    }

    const PLATFORM_FEE_PCT = 0.05;
    const gross = Math.round(balance.available / (1 - PLATFORM_FEE_PCT)); // reverse the net calc
    const fee   = Math.round(gross * PLATFORM_FEE_PCT);

    // Collect the delivered orders not yet paid out
    const deliveredOrders = await Order.find({
      'items.seller': req.user._id,
      status: 'delivered',
    }).select('_id');

    const alreadySettled = await Payout.find({
      seller: req.user._id,
      status: { $in: ['paid', 'processing'] },
    }).select('orders');

    const settledOrderIds = new Set(
      alreadySettled.flatMap(p => p.orders.map(id => id.toString()))
    );

    const unsettledOrders = deliveredOrders
      .filter(o => !settledOrderIds.has(o._id.toString()))
      .map(o => o._id);

    const now   = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 7);

    const payout = await Payout.create({
      seller:      req.user._id,
      orders:      unsettledOrders,
      grossAmount: gross,
      platformFee: fee,
      netAmount:   balance.available,
      periodStart: start,
      periodEnd:   now,
      description: `Manual withdrawal — ${unsettledOrders.length} orders`,
      status:      'processing',
      bankAccount: bankAccount || undefined,
      upiId:       upiId       || undefined,
    });

    // In production: trigger payment gateway here, then update status to 'paid'
    // For now simulate instant success:
    payout.status = 'paid';
    payout.paidAt = new Date();
    await payout.save();

    res.status(201).json({
      message:   `Withdrawal of ₹${balance.available} initiated`,
      payout,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────
// Internal: POST /api/payouts/auto-settle
// Called by a weekly cron job (e.g. node-cron in server.js)
// Settles all sellers who have unsettled delivered orders
// This route is intentionally NOT protected by sellerOnly —
// call it from your cron with a server-side secret header instead.
// ─────────────────────────────────────
router.post('/auto-settle', async (req, res) => {
  // Basic cron secret guard
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const PLATFORM_FEE_PCT = 0.05;

    // Find all sellers with delivered, unsettled orders
    const sellerAgg = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.seller', gross: { $sum: '$items.subtotal' } } },
    ]);

    const results = [];

    for (const s of sellerAgg) {
      const sellerId = s._id;

      const alreadySettled = await Payout.find({
        seller: sellerId,
        status: { $in: ['paid', 'processing'] },
      }).select('orders');

      const settledIds = new Set(
        alreadySettled.flatMap(p => p.orders.map(id => id.toString()))
      );

      const unsettled = await Order.find({
        'items.seller': sellerId,
        status: 'delivered',
      }).select('_id items');

      const toSettle = unsettled.filter(o => !settledIds.has(o._id.toString()));
      if (!toSettle.length) continue;

      const gross = toSettle.reduce((sum, o) => {
        return sum + o.items
          .filter(i => i.seller.toString() === sellerId.toString())
          .reduce((s, i) => s + i.subtotal, 0);
      }, 0);

      const fee = Math.round(gross * PLATFORM_FEE_PCT);
      const net = gross - fee;

      const now   = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 7);

      const payout = await Payout.create({
        seller:      sellerId,
        orders:      toSettle.map(o => o._id),
        grossAmount: gross,
        platformFee: fee,
        netAmount:   net,
        periodStart: start,
        periodEnd:   now,
        description: `Weekly auto-settlement — ${toSettle.length} orders`,
        status:      'paid',
        paidAt:      now,
      });

      results.push({ seller: sellerId, net, payoutId: payout._id });
    }

    res.json({ message: `Settled ${results.length} sellers`, results });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;