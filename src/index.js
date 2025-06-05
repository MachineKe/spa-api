require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { enforceHttps, setSecurityHeaders } = require("./middleware/security");
const rateLimit = require("express-rate-limit");

const app = express();
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5175",
    "https://spa.beyondsoftwares.com"
  ],
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: "Origin,X-Requested-With,Content-Type,Accept,Authorization"
};
app.use(cors(corsOptions));
const PORT = process.env.PORT || 4000;

const authRoutes = require('./routes/auth');
const tenantRoutes = require('./routes/tenant');
const serviceRoutes = require('./routes/service');
const employeeRoutes = require('./routes/employee');
const galleryRoutes = require('./routes/gallery');
const bookingRoutes = require('./routes/booking');
const giftCardRoutes = require('./routes/giftcard');
const pageContentRoutes = require('./routes/pagecontent');
const assetRoutes = require('./routes/asset');
const productRoutes = require('./routes/product');
const salesRoutes = require('./routes/sales');
const superAdminRoutes = require('./routes/superadmin');
const storeRoutes = require('./routes/store');
const auditLogRoutes = require('./routes/auditlog');
const notifyRoutes = require('./routes/notify');
const analyticsRoutes = require('./routes/analytics');
const paymentRoutes = require('./routes/payment');
const path = require('path');

app.use(express.json());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests, please try again later.",
  })
);
app.use(enforceHttps);
app.use(setSecurityHeaders);

app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/giftcards', giftCardRoutes);
app.use('/api/pagecontent', pageContentRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
// Store management
// Audit logs
// Notifications
app.use('/api/notify', notifyRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/auditlogs', auditLogRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/superadmin', superAdminRoutes);

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get("/", (_req, res) => {
  res.send("Fellas Spa & Barbershop Backend API is running.");
});

// Health check endpoint for tests
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
