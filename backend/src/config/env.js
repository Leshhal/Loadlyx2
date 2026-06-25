import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  stripeCurrency: process.env.STRIPE_CURRENCY || 'cad',
  frontendUrl: process.env.FRONTEND_URL,
  defaultTenantSlug: process.env.DEFAULT_TENANT_SLUG || 'demo',
  defaultTenantName: process.env.DEFAULT_TENANT_NAME || 'Loadlyx Demo',
  trustProxy: process.env.TRUST_PROXY === 'true'
};
