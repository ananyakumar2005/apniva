# 🚀 Apniva — India Ka Apna Market 🇮🇳

👉 **Live Demo:** https://apniva.onrender.com/

Apniva is a **dedicated e-commerce platform for Indian manufacturers**, enabling MSMEs to sell directly to customers with **fair commissions, better visibility, and higher profits**.

---

# 🌟 Problem We Solve

Indian manufacturers face major challenges:

- ❌ No Indian-only marketplace  
- ❌ High commissions (12–18%) on existing platforms  
- ❌ Limited reach beyond local markets  
- ❌ Low visibility among foreign products  

👉 Result: Small businesses struggle to scale online.

---

# 💡 Our Solution

Apniva is a **Made-in-India focused marketplace** that:

- 🇮🇳 Promotes Indian-origin products  
- 🤝 Connects manufacturers directly with customers  
- 💰 Reduces commission burden  
- 📈 Improves discoverability for MSMEs  

---

# 🔥 Key Features

## 🛍️ Customer Side
- Browse Indian products
- View product listings
- Direct purchase experience

## 🏭 Seller Side
- Add & manage products
- Track listings
- Reach nationwide customers

## ⚙️ Backend Capabilities
- JWT-based Authentication
- Product, Cart, Order management
- Seller analytics & dashboards
- Payout system with logic handling
- REST APIs for full platform functionality

---

# 💰 Unique Innovation — Dynamic Commission Pricing

Apniva introduces a **fair & dynamic commission system**:

- 📉 **5–10% lower than Amazon/Flipkart**
- 🇮🇳 Lower commission for Indian-origin products
- 📊 Based on profit margins & category
- ⚖️ Low margin → Low commission  
- 📈 High margin → Higher commission  

👉 Ensures **fair earnings for sellers + scalable business model**

---

# 🧠 Tech Stack

- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Node.js, Express.js  
- **Database:** MongoDB (Mongoose)  
- **Authentication:** JWT  
- **Deployment:** Render (single-server architecture)

---

# 🧩 Code Architecture

```bash
apniva/
├── apniva-backend/
│   ├── config/        # DB connection
│   ├── middleware/    # Auth middleware
│   ├── models/        # User, Product, Order, Payout schemas
│   ├── routes/        # API routes
│   ├── public/        # Frontend served via Express
│   ├── server.js      # Entry point
│   └── package.json
```

👉 Frontend is served directly from backend using Express static middleware  
👉 All APIs are structured under `/api/...`

---

# ⚙️ Run Locally

## 1. Clone
```bash
git clone https://github.com/ananyakumar2005/apniva.git
cd apniva/apniva-backend
```

## 2. Install
```bash
npm install
```

## 3. Setup `.env`
```env
PORT=5001
MONGO_URI=your_mongodb_url
JWT_SECRET=your_secret
CRON_SECRET=your_secret
```

## 4. Start Server
```bash
node server.js
```

## 5. Open
```
http://localhost:5001
```

---

# 🚀 Deployment

- Hosted on **Render**
- Single-server architecture (Frontend + Backend combined)

👉 **Live URL:** https://apniva.onrender.com/

---

# 📈 Future Scope

- 💳 Payment integration (Razorpay/Stripe)  
- 📊 Advanced seller analytics  
- 📱 Mobile app version  
- 🤖 AI-based recommendations  
- 🌍 Expansion to B2B marketplace  

---

# 👨‍💻 Team

- **Ananya Kumar (Frontend)**  
- **Divyam Puri (Backend)**  

---

# 🙌 Final Note

Apniva is not just a marketplace —  
it’s a step towards empowering **Indian manufacturers** and building a stronger **local economy 🇮🇳**

---

# ⭐ Support

If you like this project, give it a ⭐ on GitHub!