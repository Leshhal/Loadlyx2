import dotenv from 'dotenv';
dotenv.config();
import { requireAuth } from './middleware/requireauth.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
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

const app = express();
if (env.trustProxy) app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// Stripe webhooks must receive the raw body before JSON parsing.
app.use('/api/stripe', stripeRoutes);

app.use(express.json());
app.use(tenantMiddleware);
app.use('/api/customers', adminCustomerRoutes);
app.use('/api/balance', adminBalanceRoutes);
app.use('/api/withdrawals', adminWithdrawalRoutes);

app.get('/', (req, res) => {
  res.json({
    service: 'Loadlyx Phase 1 API',
    tenant: req.tenant.slug,
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
app.use('/api/orders', requireAuth, orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/carriers', carrierRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/checkout', checkoutRoutes);
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
