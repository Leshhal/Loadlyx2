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
  publicAppUrl: process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL,
  backendUrl: process.env.BACKEND_URL || '',
  emailProvider: (process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? 'resend' : process.env.EMAIL_WEBHOOK_URL ? 'webhook' : 'disabled')).toLowerCase(),
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || '',
  emailReplyTo: process.env.EMAIL_REPLY_TO || '',
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
  if (process.env.NODE_ENV === 'production') {
    const origins = String(process.env.PASSKEY_ORIGINS || process.env.PASSKEY_ORIGIN || env.publicAppUrl).split(',').map((value) => value.trim());
    if (origins.some((origin) => !origin.startsWith('https://'))) throw new Error('Production passkey origins must use HTTPS');
    if (!env.publicAppUrl?.startsWith('https://')) throw new Error('PUBLIC_APP_URL or FRONTEND_URL must use HTTPS in production');
    if (env.emailProvider === 'resend' && (!env.resendApiKey || !env.emailFrom)) throw new Error('RESEND_API_KEY and EMAIL_FROM are required when EMAIL_PROVIDER=resend');
    if (env.emailProvider === 'webhook' && !env.emailWebhookUrl) throw new Error('EMAIL_WEBHOOK_URL is required when EMAIL_PROVIDER=webhook');
  }
  return { required, optionalProviders: { ai: Boolean(process.env.AI_API_KEY), stripe: Boolean(process.env.STRIPE_SECRET_KEY), email: ['resend','webhook'].includes(env.emailProvider), maps: Boolean(process.env.MAPS_API_KEY) } };
}
