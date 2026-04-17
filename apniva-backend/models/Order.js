const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({

  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Items in this order
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: String,       // snapshot at time of order
    emoji: String,
    price: Number,      // price at time of order
    quantity: {
      type: Number,
      default: 1
    },
    variant: String,    // selected color/size if any
    subtotal: Number    // price * quantity
  }],

  // Delivery address (snapshot at time of order)
  deliveryAddress: {
    name: String,
    street: String,
    city: String,
    state: String,
    pincode: String,
    phone: String
  },

  // Payment
  paymentMethod: {
    type: String,
    enum: ['UPI', 'Card', 'EMI', 'COD', 'NetBanking'],
    default: 'UPI'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  promoCode: {
    type: String,
    default: ''
  },
  discountAmount: {
    type: Number,
    default: 0
  },

  // Amounts
  subtotal: {
    type: Number,
    required: true
  },
  deliveryCharge: {
    type: Number,
    default: 0       // free above ₹499
  },
  totalAmount: {
    type: Number,
    required: true
  },

  // Order status & timeline
  status: {
    type: String,
    enum: ['processing', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
    default: 'processing'
  },
  timeline: [{
    status: String,
    message: String,
    time: {
      type: Date,
      default: Date.now
    }
  }],

  // Tracking
  trackingNumber: {
    type: String,
    default: ''
  },
  expectedDelivery: {
    type: Date
  }

}, { timestamps: true });

// Auto-set expected delivery (5 days from now) before saving
orderSchema.pre('save', function (next) {
  if (this.isNew && !this.expectedDelivery) {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    this.expectedDelivery = d;

    // Add first timeline entry
    this.timeline.push({
      status: 'processing',
      message: 'Order placed successfully'
    });
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);