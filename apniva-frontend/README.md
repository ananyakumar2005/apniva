# Apniva Frontend

India-themed online shopping platform — plain HTML/CSS/JS frontend, ready to connect to a MERN backend.

## Quick Start

```bash
# 1. Install dev dependencies (one-time)
npm install

# 2. Start the dev server (auto-reloads on file save)
npm run dev

# 3. Or just serve statically
npm start
```

Then open **http://localhost:3000** in your browser.

---

## Files

| File | Description |
|------|-------------|
| `index.html` | Auth page — login/signup as Customer or Seller |
| `customer.html` | Customer app — home, catalog, cart, profile, state spotlight |
| `seller.html` | Seller dashboard — listings, analytics, payouts |

---

## npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Live-reloading dev server on port 3000 |
| `npm start` | Static server on port 3000 (no auto-reload) |
| `npm run preview` | Static server on port 5000 |

---

## Connecting to your MERN Backend

Each HTML file is commented with `// connect backend` markers. Key integration points:

### Auth (`index.html`)
Replace `doLogin()` with a real API call:
```js
// POST /api/auth/login  or  POST /api/auth/register
const res = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, role })
});
const { token, user } = await res.json();
localStorage.setItem('apniva_token', token);
```

### Products (`customer.html`)
Replace the `PRODUCTS` array with a fetch:
```js
const res = await fetch('/api/products');
const PRODUCTS = await res.json();
```

### Cart
Replace in-memory `cartItems` array with API calls:
```js
// GET  /api/cart
// POST /api/cart/add
// PUT  /api/cart/update
// DELETE /api/cart/remove/:id
```

### Seller Listings (`seller.html`)
```js
// GET    /api/seller/listings
// POST   /api/seller/listings       (submit for approval)
// PUT    /api/seller/listings/:id
// DELETE /api/seller/listings/:id
```

---

## Recommended Next Step — Migrate to Vite + React

When you're ready to add the full React component structure:

```bash
npm create vite@latest apniva-react -- --template react
cd apniva-react
npm install
npm run dev
```

Then move logic from these HTML files into React components, using the existing CSS variables and structure as your design system.
