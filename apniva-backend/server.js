const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend static files from public/ folder
app.use(express.static(path.join(__dirname, 'public')));

// Routes (unchanged)
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart',     require('./routes/cart'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/seller',   require('./routes/seller'));
app.use('/api/payouts',  require('./routes/payouts'));

// Health check
app.get('/api', (req, res) => {
  res.json({ message: 'Apniva API is running ✅' });
});

// Catch-all: serve index.html for any non-API route (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));