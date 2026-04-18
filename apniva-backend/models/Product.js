const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,

  price: {
    type: Number,
    required: true
  },

  category: String,

  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  stock: {
    type: Number,
    default: 0
  },

  isIndianOrigin: {
    type: Boolean,
    default: true
  },

  rawMaterialOrigin: {
    type: String, // "India" or "Imported"
    default: "India"
  },

  margin: {
    type: Number // for your commission logic
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', productSchema);