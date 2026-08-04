import dotenv from 'dotenv';
dotenv.config();
import { requireAuth } from './middleware/requireauth.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env, validateEnvironment } from './config/env.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.js';
import categoryRoutes from './routes/categories.js';
import productRoutes from './routes/products.js';
import quoteRoutes from './routes/quotes.js';
import loadRoutes from './routes/loads.js';
import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import stripeRoutes from './routes/stripe.js';
import carrierRoutes from './routes/carriers.js';
import tenantRoutes from './routes/tenant.js';
import checkoutRoutes from './routes/checkout.js';
import adminCustomerRoutes from './routes/customers.js';
import adminBalanceRoutes from './routes/balance.js';
import adminWithdrawalRoutes from './routes/withdrawals.js';
import financeRoutes from './routes/finance.js';
import uploadRoutes from './routes/uploads.js';
import themeRoutes from './routes/themes.js';
import reviewRoutes from './routes/reviews.js';
import disputeRoutes from './routes/disputes.js';
import platformAdminRoutes from './routes/platformAdmin.js';
import operationsMapRoutes from './routes/operationsMap.js';
import simulationRoutes from './routes/simulation.js';
import aiRoutes from './routes/ai.js';
import cryptoRoutes from './routes/crypto.js';
import marketplaceRoutes from './routes/marketplace.js';
import operatingSystemRoutes from './routes/operatingSystem.js';
import passkeyRoutes from './routes/passkeys.js';
import paymentSettingsRoutes from './routes/paymentSettings.js';
import websiteRoutes from './routes/website.js';
import cartRoutes from './routes/cart.js';
import collectionRoutes from './routes/collections.js';
import shippingRoutes from './routes/shipping.js';
import rentalRoutes from './routes/rentals.js';

const app = express();
validateEnvironment();
if (env.trustProxy) app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));
const allowedOrigins = [
'http://localhost:3000',
'https://loadlyx2.vercel.app',
'https://loadlyx.com',
'https://www.loadlyx.com'
].concat((process.env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean));

app.use(cors({
origin(origin, callback) {
if (!origin) return callback(null, true);

if (
allowedOrigins.includes(origin) ||
origin.endsWith('.loadlyx.com')
) {
return callback(null, true);
}

return callback(new Error('Not allowed by CORS'));
},
credentials: true
}));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.nodeEnv === 'production' ? 25 : 100,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Try again later.' }
});

// Stripe webhooks must receive the raw body before JSON parsing.
app.use('/api/stripe', stripeRoutes);

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '12mb' }));
app.use(tenantMiddleware);
app.use('/api/customers', requireAuth, adminCustomerRoutes);
app.use('/api/balance', requireAuth, adminBalanceRoutes);
app.use('/api/withdrawals', requireAuth, adminWithdrawalRoutes);
app.use('/api/payment-settings', requireAuth, paymentSettingsRoutes);
app.use('/api/website', websiteRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/rentals', rentalRoutes);

app.get('/', (req, res) => {
  res.json({
    service: 'Loadlyx v3.2 API',
    tenant: req.tenant?.slug || null,
    cloudflareReady: true,
    multiTenantReady: true,
    stripeReady: Boolean(env.stripeSecretKey)
  });
});

app.use('/api/health', healthRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/loads', loadRoutes);
app.use('/api/orders', (req, res, next) => {
  const publicStoreCheckout = req.method === 'POST' && req.path === '/checkout';
  const publicCheckoutConfirmation = req.method === 'GET' && req.path.startsWith('/checkout-session/');
  return publicStoreCheckout || publicCheckoutConfirmation ? next() : requireAuth(req, res, next);
}, orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/carriers', carrierRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/themes', themeRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/platform-admin', platformAdminRoutes);
app.use('/api/operations-map', operationsMapRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/operating-system', operatingSystemRoutes);
app.use('/api/passkeys', authLimiter, passkeyRoutes);
;

app.use(errorHandler);

app.listen(env.port, '0.0.0.0', () => {
  console.log(`Loadlyx backend running on http://localhost:${env.port}`);
  if (env.stripeSecretKey) {
    console.log('Stripe checkout is enabled.');
  } else {
    console.log('Stripe checkout is disabled until STRIPE_SECRET_KEY is set.');
  }
});
