import { env } from '../config/env.js';
import { chainSupportMatrix } from './cryptoService.js';
import { oauthReadiness } from './oauthService.js';
import { paypalReadiness } from './paypalService.js';

function configuredState(configured, label = 'CONFIGURED') { return configured ? label : 'CONFIGURATION REQUIRED'; }
export function providerConfigurationStatus() {
  const oauth = Object.fromEntries(['google','apple','discord'].map((provider) => { const state = oauthReadiness(provider); return [provider, { status: configuredState(state.configured), configured: state.configured, missing: state.missing, liveVerified: false }]; }));
  const fallbackOrigin = env.publicAppUrl || 'http://localhost:3000';
  const rpId = process.env.PASSKEY_RP_ID || new URL(fallbackOrigin).hostname;
  const origins = String(process.env.PASSKEY_ORIGINS || process.env.PASSKEY_ORIGIN || fallbackOrigin).split(',').map((value) => value.trim()).filter(Boolean);
  const passkeysConfigured = env.nodeEnv !== 'production' || (rpId !== 'localhost' && origins.every((origin) => origin.startsWith('https://')));
  const paypal = paypalReadiness();
  const emailConfigured = env.emailProvider === 'resend' ? Boolean(env.resendApiKey && env.emailFrom) : env.emailProvider === 'webhook' ? Boolean(env.emailWebhookUrl) : false;
  return { authentication: { ...oauth, passkeys: { status: configuredState(passkeysConfigured), rpId, origins, liveVerified: false } }, email: { provider: env.emailProvider.toUpperCase(), status: configuredState(emailConfigured), configured: emailConfigured, deliveryVerified: false, domainVerification: 'OWNER VERIFICATION REQUIRED' }, payments: { stripe: { status: env.stripeSecretKey ? (env.stripeSecretKey.startsWith('sk_live_') ? 'CONFIGURED' : 'SANDBOX') : 'CONFIGURATION REQUIRED', configured: Boolean(env.stripeSecretKey), webhookConfigured: Boolean(env.stripeWebhookSecret), liveVerified: false }, paypal: { status: paypal.configured ? (paypal.mode === 'LIVE' ? 'CONFIGURED' : 'SANDBOX') : 'CONFIGURATION REQUIRED', configured: paypal.configured, webhookConfigured: paypal.webhookConfigured, mode: paypal.mode, liveVerified: false } }, crypto: { chains: chainSupportMatrix(), listener: { status: process.env.CRYPTO_LISTENER_ENABLED === 'true' ? 'CONFIGURED' : 'CONFIGURATION REQUIRED', configured: process.env.CRYPTO_LISTENER_ENABLED === 'true', liveVerified: false }, withdrawals: { status: 'CONFIGURATION REQUIRED', reason: 'Secure signing and custody are not configured' } }, infrastructure: { database: 'RUNTIME CHECK REQUIRED', queue: 'POSTGRES_DURABLE_QUEUE', emailWorker: env.emailProvider === 'disabled' ? 'DISABLED' : 'CONFIGURED' } };
}

export const PROVIDER_ENVIRONMENT_VARIABLES = Object.freeze(['PUBLIC_APP_URL','BACKEND_URL','PASSKEY_RP_NAME','PASSKEY_RP_ID','PASSKEY_ORIGIN','PASSKEY_ORIGINS','EMAIL_PROVIDER','RESEND_API_KEY','EMAIL_FROM','EMAIL_REPLY_TO','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REDIRECT_URI','APPLE_CLIENT_ID','APPLE_CLIENT_SECRET','APPLE_REDIRECT_URI','APPLE_TEAM_ID','APPLE_KEY_ID','APPLE_PRIVATE_KEY','DISCORD_CLIENT_ID','DISCORD_CLIENT_SECRET','DISCORD_REDIRECT_URI','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','PAYPAL_WEBHOOK_ID','PAYPAL_PARTNER_ATTRIBUTION_ID','PAYPAL_MODE','CRYPTO_LISTENER_ENABLED','SOL_RPC_URL','SOL_NETWORK','SOL_TREASURY_ADDRESS','ADA_RPC_URL','ADA_NETWORK','ADA_TREASURY_ADDRESS','ETH_RPC_URL','ETH_NETWORK','ETH_TREASURY_ADDRESS','BTC_RPC_URL','BTC_NETWORK','BTC_TREASURY_ADDRESS','WORKER_QUEUES','DATABASE_URL']);
export function environmentVariableAudit() { return PROVIDER_ENVIRONMENT_VARIABLES.map((name) => ({ name, state: process.env[name] ? 'PRESENT' : 'MISSING' })); }
