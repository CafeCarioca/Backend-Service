//MErcado pago EcommerceCarioca
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const app = express();

// Detrás de nginx/proxy: necesario para que el rate limit vea la IP real
app.set('trust proxy', 1);

// Headers de seguridad HTTP (clickjacking, MIME sniffing, etc.)
app.use(helmet());

// CORS: en producción setear CORS_ORIGINS en el .env (CSV), ej:
// CORS_ORIGINS=https://cafecarioca.com.uy,https://admin.cafecarioca.com.uy
// Sin la variable queda abierto (útil en desarrollo local).
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : {}));

// Rate limiting general (configurable con RATE_LIMIT_MAX)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Límite estricto para validación de cupones (evita brute-force de códigos)
app.use(
  '/coupons/validate',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos, probá de nuevo más tarde' },
  })
);

app.get('/', (req, res) => {
    res.send('Hello root route');
});

// Import routes
const productsRoute = require('./routes/products');
const paymentRoutes = require('./routes/payments');
const orderroute = require('./routes/orders');
const emailRoute = require('./routes/emails');
const userRoute = require('./routes/users');
const apiGoogleRoute = require('./routes/apiGoogle.js');
const dashboardRoute = require('./routes/dashboard');
const discountsRoute = require('./routes/discounts');
const couponsRoute = require('./routes/coupons');
const categoriesRoute = require('./routes/categories');
const newsletterRoute = require('./routes/newsletter');


app.use(bodyParser.json());

// Use the routes
app.use('/products', productsRoute);
app.use('/payments', paymentRoutes);
app.use('/orders', orderroute);
app.use('/emails', emailRoute);
app.use('/users', userRoute);
app.use('/dashboard', dashboardRoute);
app.use('/discounts', discountsRoute);
app.use('/coupons', couponsRoute);
app.use('/categories', categoriesRoute);
app.use('/newsletter', newsletterRoute);

// Route API Google Reviews

app.use('/googleapi', apiGoogleRoute);



const port = process.env.PORT || 3000; // You can use environment variables for port configuration

app.listen(port, () => {
    logger.log(`Server is running on port ${port}`);
});
