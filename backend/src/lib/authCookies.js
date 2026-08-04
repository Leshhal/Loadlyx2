const REFRESH_COOKIE = 'loadlyx_refresh';

export function refreshCookieName() {
  return REFRESH_COOKIE;
}

export function refreshCookieOptions() {
  const secure = process.env.NODE_ENV === 'production';
  const sameSite = String(process.env.AUTH_COOKIE_SAME_SITE || (secure ? 'none' : 'lax')).toLowerCase();
  return {
    httpOnly: true,
    secure,
    sameSite: ['lax', 'strict', 'none'].includes(sameSite) ? sameSite : 'lax',
    path: '/api/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    ...(process.env.AUTH_COOKIE_DOMAIN ? { domain: process.env.AUTH_COOKIE_DOMAIN } : {})
  };
}

export function readCookie(req, name = REFRESH_COOKIE) {
  const header = String(req.headers?.cookie || '');
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return null;
}

export function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions());
}

export function clearRefreshCookie(res) {
  const { maxAge: _maxAge, ...options } = refreshCookieOptions();
  res.clearCookie(REFRESH_COOKIE, options);
}
