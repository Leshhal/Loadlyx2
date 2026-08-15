import { env } from '../config/env.js';

export class EmailDeliveryError extends Error {
  constructor(message, cause) {
    super(message, cause ? { cause } : undefined);
    this.name = 'EmailDeliveryError';
    this.code = 'EMAIL_DELIVERY_UNAVAILABLE';
    this.status = 503;
  }
}

export function emailDeliveryReadiness(config = env) {
  if (config.emailProvider === 'resend') return { configured: Boolean(config.resendApiKey && config.emailFrom), provider: 'resend' };
  if (config.emailProvider === 'webhook') return { configured: Boolean(config.emailWebhookUrl), provider: 'webhook' };
  return { configured: false, provider: config.emailProvider || 'disabled' };
}

const templates = {
  'verify-email': ({ name, actionUrl }) => ({
    subject: 'Verify your Loadlyx account',
    preheader: 'Confirm your email address to finish setting up Loadlyx.',
    heading: 'Verify your email address',
    intro: `Hi${name ? ` ${name}` : ''}, confirm this email address to securely activate your Loadlyx account.`,
    button: 'Verify Email', actionUrl,
    expiry: 'This verification link expires in 24 hours.',
    security: 'If you did not create a Loadlyx account, you can safely ignore this email.'
  }),
  'reset-password': ({ name, actionUrl }) => ({
    subject: 'Reset your Loadlyx password',
    preheader: 'Use this secure link to choose a new password.',
    heading: 'Reset your password',
    intro: `Hi${name ? ` ${name}` : ''}, we received a request to reset your Loadlyx password.`,
    button: 'Reset Password', actionUrl,
    expiry: 'This password-reset link expires in one hour and can only be used once.',
    security: 'If you did not request this change, ignore this email and your password will remain unchanged.'
  })
};

function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character])); }
export function renderEmailTemplate(template, variables) {
  const build = templates[template];
  if (!build) throw new Error(`Unknown email template: ${template}`);
  const content = build(variables);
  const html = `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#13213c"><div style="display:none">${escapeHtml(content.preheader)}</div><table role="presentation" width="100%"><tr><td align="center" style="padding:40px 16px"><table role="presentation" width="100%" style="max-width:600px;background:#fff;border-radius:18px;border:1px solid #dfe6f2"><tr><td style="padding:34px"><div style="font-weight:800;font-size:22px;color:#2457f5">Loadlyx</div><h1 style="font-size:28px;margin:28px 0 12px">${escapeHtml(content.heading)}</h1><p style="line-height:1.65">${escapeHtml(content.intro)}</p><p style="margin:28px 0"><a href="${escapeHtml(content.actionUrl)}" style="display:inline-block;background:#2457f5;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:10px">${escapeHtml(content.button)}</a></p><p style="font-size:14px;color:#66738c">${escapeHtml(content.expiry)}</p><p style="font-size:13px;color:#7a879e">${escapeHtml(content.security)}</p></td></tr></table></td></tr></table></body></html>`;
  const text = `${content.heading}\n\n${content.intro}\n\n${content.button}: ${content.actionUrl}\n\n${content.expiry}\n${content.security}`;
  return { ...content, html, text };
}

async function deliver(template, recipient, variables) {
  const rendered = renderEmailTemplate(template, variables);
  try {
    if (env.emailProvider === 'resend') {
      const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: env.emailFrom, to: [recipient], subject: rendered.subject, html: rendered.html, text: rendered.text, ...(env.emailReplyTo ? { reply_to: env.emailReplyTo } : {}) }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`Resend delivery failed (${response.status}): ${body.message || 'provider error'}`);
      return { delivered: true, transport: 'resend', providerId: body.id || null };
    }
    if (env.emailProvider === 'webhook' && env.emailWebhookUrl) {
      const response = await fetch(env.emailWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(env.emailWebhookSecret ? { Authorization: `Bearer ${env.emailWebhookSecret}` } : {}) }, body: JSON.stringify({ template, recipient, variables, message: rendered }) });
      if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
      return { delivered: true, transport: 'webhook' };
    }
    if (env.emailProvider === 'disabled') {
      if (env.nodeEnv === 'production') throw new EmailDeliveryError('Email delivery is not configured');
      console.info(`[email:development] ${template} for ${recipient}: ${variables.actionUrl}`);
      return { delivered: false, transport: 'development-console' };
    }
    throw new Error(`Unsupported email provider: ${env.emailProvider}`);
  } catch (error) {
    if (error instanceof EmailDeliveryError) throw error;
    throw new EmailDeliveryError('Email delivery failed', error);
  }
}

export function sendVerificationEmail(user, token) {
  return deliver('verify-email', user.email, {
    name: user.fullName || '',
    actionUrl: `${env.publicAppUrl}/verify-email?token=${encodeURIComponent(token)}`
  });
}

export function sendPasswordResetEmail(user, token) {
  return deliver('reset-password', user.email, {
    name: user.fullName || '',
    actionUrl: `${env.publicAppUrl}/reset-password?token=${encodeURIComponent(token)}`
  });
}
