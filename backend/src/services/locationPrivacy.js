import crypto from 'crypto';

function header(req, names) {
  for (const name of names) {
    const value = req.headers[name];
    if (value) return decodeURIComponent(String(value)).slice(0, 120);
  }
  return null;
}

function boundedCoordinate(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return Math.round(number * 100) / 100;
}

export function hashConnectionValue(value, secret = process.env.CONNECTION_HASH_SECRET || process.env.JWT_SECRET) {
  if (!secret) throw new Error('CONNECTION_HASH_SECRET or JWT_SECRET is required');
  return crypto.createHmac('sha256', secret).update(String(value || 'unknown')).digest('hex');
}

export function approximateConnection(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  return {
    ipHash: hashConnectionValue(forwarded),
    city: header(req, ['x-vercel-ip-city', 'cf-ipcity']),
    region: header(req, ['x-vercel-ip-country-region', 'cf-region']),
    country: header(req, ['x-vercel-ip-country', 'cf-ipcountry']),
    latitude: boundedCoordinate(header(req, ['x-vercel-ip-latitude', 'cf-iplatitude']), -90, 90),
    longitude: boundedCoordinate(header(req, ['x-vercel-ip-longitude', 'cf-iplongitude']), -180, 180),
    source: 'EDGE_HEADERS'
  };
}

export function mapPosition(latitude, longitude) {
  const lat = boundedCoordinate(latitude, -90, 90);
  const lng = boundedCoordinate(longitude, -180, 180);
  if (lat === null || lng === null) return null;
  return { x: Math.round(((lng + 180) / 360) * 10000) / 100, y: Math.round(((90 - lat) / 180) * 10000) / 100 };
}
