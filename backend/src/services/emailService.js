import { env } from '../config/env.js';

async function deliver(template, recipient, variables) {
  if (!env.emailWebhookUrl) {
    if (env.nodeEnv === 'production') {
      throw new Error('EMAIL_WEBHOOK_URL is required to send authentication email in production');
    }
    console.info(`[email:development] ${template} for ${recipient}: ${variables.actionUrl}`);
    return { delivered: false, transport: 'development-console' };
  }

  const response = await fetch(env.emailWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(env.emailWebhookSecret ? { Authorization: `Bearer ${env.emailWebhookSecret}` } : {})
    },
    body: JSON.stringify({ template, recipient, variables })
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  return { delivered: true, transport: 'webhook' };
}

export function sendVerificationEmail(user, token) {
  return deliver('verify-email', user.email, {
    name: user.fullName || '',
    actionUrl: `${env.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`
  });
}

export function sendPasswordResetEmail(user, token) {
  return deliver('reset-password', user.email, {
    name: user.fullName || '',
    actionUrl: `${env.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`
  });
}
