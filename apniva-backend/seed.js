/**
 * seed.js — Apniva sample data seeder
 * Run with: npm run seed
 *
 * Creates:
 *   1 demo seller  → ramesh@textiles.in / password123
 *   1 demo customer → priya@example.com / password123
 *   12 sample products (all approved)
 */

const mongoose = require('mongoose');
const dotenv   = require('dotenv');
const bcrypt   = require('bcryptjs');

dotenv.config();

const User    = require('./models/User');
const Product = require('./models/Product');
const Order   = require('./models/Order');
const Payout  = require('./models/Payout');

const PRODUCTS_DATA = [
  { name: 'Wireless Noise-Cancelling Earbuds', category: 'Electronics',     emoji: '🎧', price: 999,  mrp: 2499, stock: 120, brand: 'SoundWave India',      originState: 'Karnataka',    rating: 4.5, numReviews: 2341 },
  { name: 'Slim Aluminium Laptop Stand',       category: 'Electronics',     emoji: '💻', price: 799,  mrp: 1600, stock: 85,  brand: 'DeskMate Co.',         originState: 'Maharashtra',  rating: 4.3, numReviews: 876  },
  { name: 'Kanchipuram Silk Saree',            category: 'Fashion',         emoji: '👗', price: 1299, mrp: 3500, stock: 42,  brand: 'Silk Threads India',   originState: 'Tamil Nadu',   rating: 4.8, numReviews: 3120 },
  { name: 'Mens Kurta Set — Festive',          category: 'Fashion',         emoji: '🧥', price: 849,  mrp: 1800, stock: 67,  brand: 'Ethnic Roots',         originState: 'Uttar Pradesh',rating: 4.2, numReviews: 654  },
  { name: 'Handcrafted Brass Teapot',          category: 'Handcrafted',     emoji: '🫖', price: 449,  mrp: 899,  stock: 30,  brand: 'ArtisanCraft Co.',     originState: 'Rajasthan',    rating: 4.7, numReviews: 432  },
  { name: 'Indian Classic Literature Bundle',  category: 'Books',           emoji: '📚', price: 349,  mrp: 700,  stock: 200, brand: 'Penguin India',        originState: 'Delhi',        rating: 4.6, numReviews: 1200 },
  { name: 'Ayurvedic Skincare Kit',            category: 'Beauty',          emoji: '🌿', price: 699,  mrp: 1400, stock: 90,  brand: 'Vedic Glow',           originState: 'Kerala',       rating: 4.4, numReviews: 987  },
  { name: 'Premium Cricket Bat — Full Size',   category: 'Sports',          emoji: '🏏', price: 1599, mrp: 3200, stock: 25,  brand: 'PlayCraft Sports',     originState: 'Punjab',       rating: 4.5, numReviews: 342  },
  { name: 'Stainless Steel Cookware Set',      category: 'Home & Kitchen',  emoji: '🍳', price: 1199, mrp: 2800, stock: 55,  brand: 'KitchenPro India',     originState: 'Gujarat',      rating: 4.3, numReviews: 1560 },
  { name: 'Diya Diyas — Set of 12',            category: 'Handcrafted',     emoji: '🪔', price: 249,  mrp: 499,  stock: 500, brand: 'Diwali Craft Store',   originState: 'Uttar Pradesh',rating: 4.9, numReviews: 8741 },
  { name: 'Organic Basmati Rice 5kg',          category: 'Groceries',       emoji: '🌾', price: 399,  mrp: 599,  stock: 150, brand: 'Organic Farmer Co.',   originState: 'Punjab',       rating: 4.6, numReviews: 2300 },
  { name: 'Wooden Building Blocks — 50pc',     category: 'Toys',            emoji: '🧱', price: 599,  mrp: 1199, stock: 75,  brand: 'TinyHands Toys',       originState: 'Rajasthan',    rating: 4.7, numReviews: 543  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // ── Wipe existing data ──────────────────────────
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      Payout.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // ── Create demo seller ──────────────────────────
    const seller = await User.create({
      name:          'Ramesh Textiles',
      email:         'ramesh@textiles.in',
      mobile:        '9876543210',
      password:      'password123',
      role:          'seller',
      businessName:  'Ramesh Silk House',
      gstNumber:     '09ABCDE1234F1Z5',
      businessState: 'Uttar Pradesh',
      sellerRating:  4.7,
      totalReviews:  312,
    });
    console.log(`🏪 Seller created: ${seller.email}`);

    // ── Create demo customer ────────────────────────
    const customer = await User.create({
      name:     'Priya Sharma',
      email:    'priya@example.com',
      mobile:   '9123456789',
      password: 'password123',
      role:     'customer',
      addresses: [
        {
          label:     'Home',
          street:    '42, Lotus Lane, Koramangala 5th Block',
          city:      'Bengaluru',
          state:     'Karnataka',
          pincode:   '560095',
          phone:     '9123456789',
          isDefault: true,
        },
      ],
    });
    console.log(`🛍️  Customer created: ${customer.email}`);

    // ── Create products (all approved, seller = ramesh) ──
    const products = await Product.insertMany(
      PRODUCTS_DATA.map(p => ({
        ...p,
        seller:     seller._id,
        status:     'approved',
        dispatchDays: '3-5 days',
        returnPolicy: '7-day return',
      }))
    );
    console.log(`📦 ${products.length} products created`);

    // ── Create 2 sample orders ──────────────────────
    const order1 = await Order.create({
      buyer: customer._id,
      items: [
        {
          product:  products[0]._id,
          seller:   seller._id,
          name:     products[0].name,
          emoji:    products[0].emoji,
          price:    products[0].price,
          quantity: 1,
          subtotal: products[0].price,
        },
      ],
      deliveryAddress: customer.addresses[0],
      paymentMethod:   'UPI',
      paymentStatus:   'paid',
      subtotal:        products[0].price,
      deliveryCharge:  0,
      totalAmount:     products[0].price,
      status:          'delivered',
    });

    const order2 = await Order.create({
      buyer: customer._id,
      items: [
        {
          product:  products[2]._id,
          seller:   seller._id,
          name:     products[2].name,
          emoji:    products[2].emoji,
          price:    products[2].price,
          quantity: 1,
          subtotal: products[2].price,
        },
      ],
      deliveryAddress: customer.addresses[0],
      paymentMethod:   'Card',
      paymentStatus:   'paid',
      subtotal:        products[2].price,
      deliveryCharge:  0,
      totalAmount:     products[2].price,
      status:          'processing',
    });

    console.log(`📋 2 sample orders created`);

    console.log('\n🎉 Seed complete!\n');
    console.log('─────────────────────────────────');
    console.log('  Seller  → ramesh@textiles.in  / password123');
    console.log('  Customer→ priya@example.com   / password123');
    console.log('─────────────────────────────────');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();