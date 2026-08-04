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
  emailWebhookUrl: process.env.EMAIL_WEBHOOK_URL || '',
  emailWebhookSecret: process.env.EMAIL_WEBHOOK_SECRET || '',
  defaultTenantSlug: process.env.DEFAULT_TENANT_SLUG || 'demo',
  defaultTenantName: process.env.DEFAULT_TENANT_NAME || 'Loadlyx Demo',
  trustProxy: process.env.TRUST_PROXY === 'true'
};

export function validateEnvironment() {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  if (process.env.NODE_ENV === 'production' && String(process.env.JWT_SECRET).length < 32) throw new Error('JWT_SECRET must contain at least 32 characters in production');
  if ((process.env.PASSKEY_RP_ID || '').includes('://')) throw new Error('PASSKEY_RP_ID must be a hostname, not a URL');
  return { required, optionalProviders: { ai: Boolean(process.env.AI_API_KEY), stripe: Boolean(process.env.STRIPE_SECRET_KEY), email: Boolean(process.env.EMAIL_WEBHOOK_URL), maps: Boolean(process.env.MAPS_API_KEY) } };
}
