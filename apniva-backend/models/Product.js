const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Electronics', 'Fashion', 'Home & Kitchen', 'Beauty', 'Books', 'Groceries', 'Toys', 'Sports', 'Handcrafted']
  },
  emoji: {
    type: String,
    default: '📦'
  },

  // Pricing
  price: {
    type: Number,
    required: true
  },
  mrp: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,   // percentage, auto-calculated
    default: 0
  },

  // Inventory
  stock: {
    type: Number,
    required: true,
    default: 0
  },
  sku: {
    type: String,
    trim: true
  },
  weightGrams: {
    type: Number
  },

  // Images
  images: [{
    type: String   // URLs from cloud storage later
  }],

  // Variants
  colors: [String],
  sizes: [String],

  // Ratings
  rating: {
    type: Number,
    default: 0
  },
  numReviews: {
    type: Number,
    default: 0
  },

  // India-specific
  originState: {
    type: String
  },
  giTag: {
    type: String    // Geographical Indication number
  },
  handcraftedBadge: {
    type: String,
    enum: ['', 'Handcrafted — traditional method', 'Handcrafted — artisan collective', 'Organic / Natural'],
    default: ''
  },
  badge: {
    type: String,
    enum: ['', 'hot', 'new'],
    default: ''
  },

  // Seller reference
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  brand: {
    type: String,
    trim: true
  },

  // Listing status (set by admin after review)
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    default: ''
  },

  // Shipping
  dispatchDays: {
    type: String,
    default: '3–5 days'
  },
  returnPolicy: {
    type: String,
    default: '7-day return'
  },

}, { timestamps: true });

// Auto-calculate discount before saving
productSchema.pre('save', function (next) {
  if (this.mrp > 0) {
    this.discount = Math.round(((this.mrp - this.price) / this.mrp) * 100);
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);