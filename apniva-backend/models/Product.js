const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    // ── Core Info ──────────────────────────────────────
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    emoji: {
      type: String,
      default: '📦',
    },
    brand: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Electronics',
        'Fashion',
        'Home & Kitchen',
        'Beauty',
        'Books',
        'Groceries',
        'Toys',
        'Sports',
        'Handcrafted',
      ],
    },
    originState: {
      type: String,
      default: '',
    },

    // ── Pricing ────────────────────────────────────────
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    mrp: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPercent: {
      type: Number,
      default: 0,
    },

    // ── Inventory ──────────────────────────────────────
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    sku: {
      type: String,
      default: '',
    },
    weightGrams: {
      type: Number,
      default: 0,
    },

    // ── Media ──────────────────────────────────────────
    images: {
      type: [String],
      default: [],
    },

    // ── Variants ───────────────────────────────────────
    variants: {
      type: [String],  // e.g. ['Red', 'Blue', 'Green']
      default: [],
    },
    sizes: {
      type: [String],  // e.g. ['S', 'M', 'L', 'XL']
      default: [],
    },

    // ── Shipping ───────────────────────────────────────
    dispatchDays: {
      type: String,
      default: '3-5 days',
    },
    returnPolicy: {
      type: String,
      default: '7-day return',
    },

    // ── Certifications ─────────────────────────────────
    giTag: {
      type: String,
      default: '',
    },
    artisanBadge: {
      type: String,
      default: 'Not applicable',
    },

    // ── Ratings ────────────────────────────────────────
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },

    // ── Relationships ──────────────────────────────────
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Origin flags ───────────────────────────────────
    isIndianOrigin: {
      type: Boolean,
      default: true,
    },
    rawMaterialOrigin: {
      type: String,
      default: 'India',
    },

    // ── Admin / Approval ───────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: '',
    },

    // ── Margin (for commission logic) ──────────────────
    margin: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Auto-calculate discountPercent before saving
productSchema.pre('save', function (next) {
  if (this.isModified('price') || this.isModified('mrp')) {
    if (this.mrp > 0) {
      this.discountPercent = Math.round(((this.mrp - this.price) / this.mrp) * 100);
    }
  }
  next();
});

// Virtual: check if in stock
productSchema.virtual('inStock').get(function () {
  return this.stock > 0;
});

module.exports = mongoose.model('Product', productSchema);