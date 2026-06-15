const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  mobile: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['customer', 'seller'],
    default: 'customer'
  },

  // Customer fields
  cart: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    qty:     { type: Number, default: 1, min: 1 }
  }],
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  addresses: [{
    label:     String,
    street:    String,
    city:      String,
    state:     String,
    pincode:   String,
    phone:     String,
    isDefault: { type: Boolean, default: false }
  }],

  // Seller — Business Info
  businessName:  String,
  gstNumber:     String,
  businessState: String,
  sellerRating:  { type: Number, default: 0 },
  totalReviews:  { type: Number, default: 0 },

  // Seller — Payout Details
  upiId: {
    type: String,
    default: ''
  },
  bankAccount: {
    accountHolder: { type: String, default: '' },
    accountNumber: { type: String, default: '' },  // store masked e.g. ••••4521
    ifscCode:      { type: String, default: '' },
    bankName:      { type: String, default: '' },
  },

}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password at login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);