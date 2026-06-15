const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({

  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Orders included in this settlement
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],

  // Amounts
  grossAmount: {
    type: Number,
    required: true    // total order value
  },
  platformFee: {
    type: Number,
    default: 0        // Apniva's commission (e.g. 5%)
  },
  netAmount: {
    type: Number,
    required: true    // grossAmount - platformFee
  },

  // Settlement period
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  description: {
    type: String,     // e.g. "Weekly settlement — 84 orders"
    default: ''
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed'],
    default: 'pending'
  },
  paidAt: {
    type: Date
  },

  // Bank account snapshot at time of payout
  bankAccount: {
    accountHolder: String,
    accountNumber: String,   // store masked e.g. ••••4521
    ifscCode: String,
    bankName: String
  },

  // UPI alternative
  upiId: {
    type: String,
    default: ''
  },

  // Reference number from payment gateway
  transactionRef: {
    type: String,
    default: ''
  }

}, { timestamps: true });

// Auto-calculate netAmount before saving
payoutSchema.pre('save', function (next) {
  if (this.isModified('grossAmount') || this.isModified('platformFee')) {
    this.netAmount = this.grossAmount - this.platformFee;
  }
  next();
});

module.exports = mongoose.model('Payout', payoutSchema);