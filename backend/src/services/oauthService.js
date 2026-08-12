import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const providers = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth', tokenUrl: 'https://oauth2.googleapis.com/token', userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo', scope: 'openid email profile'
  },
  discord: {
    authorizeUrl: 'https://discord.com/oauth2/authorize', tokenUrl: 'https://discord.com/api/oauth2/token', userInfoUrl: 'https://discord.com/api/users/@me', scope: 'identify email'
  },
  apple: {
    authorizeUrl: 'https://appleid.apple.com/auth/authorize', tokenUrl: 'https://appleid.apple.com/auth/token', scope: 'name email', responseMode: 'form_post'
  }
};

export function oauthConfig(provider) {
  const base = providers[provider];
  if (!base) return null;
  const prefix = provider.toUpperCase();
  return { ...base, provider, clientId: process.env[`${prefix}_CLIENT_ID`], clientSecret: process.env[`${prefix}_CLIENT_SECRET`], redirectUri: process.env[`${prefix}_REDIRECT_URI`] };
}

export function oauthReadiness(provider) {
  const config = oauthConfig(provider);
  const missing = ['clientId', 'clientSecret', 'redirectUri'].filter((key) => !config?.[key]);
  return { configured: missing.length === 0, missing };
}

export function requireVerifiedOAuthIdentity(profile) {
  if (!profile?.email || profile.emailVerified !== true) {
    throw new Error('The provider must return a verified email address');
  }
  return profile;
}

export function authorizationUrl(config, state) {
  const url = new URL(config.authorizeUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scope);
  url.searchParams.set('state', state);
  if (config.responseMode) url.searchParams.set('response_mode', config.responseMode);
  if (config.provider === 'google') url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

async function verifyAppleIdentityToken(token, clientId) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded?.header?.kid) throw new Error('Apple identity token has no key identifier');
  const response = await fetch('https://appleid.apple.com/auth/keys');
  if (!response.ok) throw new Error('Unable to load Apple signing keys');
  const jwks = await response.json();
  const jwk = jwks.keys?.find((key) => key.kid === decoded.header.kid);
  if (!jwk) throw new Error('Apple signing key not found');
  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  return jwt.verify(token, publicKey, { algorithms: ['RS256'], audience: clientId, issuer: 'https://appleid.apple.com' });
}

export async function exchangeOAuthCode(config, code) {
  const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: config.redirectUri, client_id: config.clientId, client_secret: config.clientSecret });
  const tokenResponse = await fetch(config.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body });
  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenData.access_token) throw new Error(tokenData.error_description || tokenData.error || 'OAuth token exchange failed');

  if (config.provider === 'apple') {
    if (!tokenData.id_token) throw new Error('Apple did not return an identity token');
    const identity = await verifyAppleIdentityToken(tokenData.id_token, config.clientId);
    return { providerAccountId: String(identity.sub), email: identity.email ? String(identity.email).toLowerCase() : null, name: null, emailVerified: identity.email_verified === true || identity.email_verified === 'true' };
  }

  const profileResponse = await fetch(config.userInfoUrl, { headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' } });
  const profile = await profileResponse.json().catch(() => ({}));
  if (!profileResponse.ok) throw new Error('OAuth profile request failed');
  if (config.provider === 'discord') return { providerAccountId: String(profile.id), email: profile.email ? String(profile.email).toLowerCase() : null, name: profile.global_name || profile.username || null, emailVerified: Boolean(profile.verified) };
  return { providerAccountId: String(profile.sub), email: profile.email ? String(profile.email).toLowerCase() : null, name: profile.name || null, emailVerified: Boolean(profile.email_verified) };
}
