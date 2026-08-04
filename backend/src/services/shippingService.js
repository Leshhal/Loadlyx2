import crypto from 'crypto';
import { prisma } from '../db/prisma.js';

const carriers = {
  MOCK: async ({ packageWeightKg }) => [{ serviceName: 'Development Ground', serviceCode: 'MOCK_GROUND', rateCents: 1299 + Math.ceil(packageWeightKg * 120), estimatedTransitDays: 3 }],
  MANUAL: async ({ config }) => [{ serviceName: 'Tenant flat rate', serviceCode: 'MANUAL_FLAT', rateCents: config.flatRateCents ?? 0, estimatedTransitDays: config.settingsJson?.transitDays ?? null }],
  FEDEX: unavailableCarrier('FedEx', 'FEDEX_CLIENT_ID', 'FEDEX_CLIENT_SECRET'),
  UPS: unavailableCarrier('UPS', 'UPS_CLIENT_ID', 'UPS_CLIENT_SECRET'),
  DHL: unavailableCarrier('DHL', 'DHL_API_KEY', 'DHL_API_SECRET'),
};

function unavailableCarrier(name, ...keys) {
  return async () => {
    if (!keys.every((key) => process.env[key])) throw Object.assign(new Error(`${name} credentials are not configured`), { code: 'PROVIDER_NOT_CONFIGURED' });
    throw Object.assign(new Error(`${name} adapter is configured but requires external sandbox verification`), { code: 'NOT_EXTERNALLY_VERIFIED' });
  };
}

export function normalizeShippingRequest(input) {
  const packageWeightKg = input.packages.reduce((sum, item) => sum + item.weightKg * item.quantity, 0);
  if (!input.destinationPostalCode || !input.originPostalCode) throw new Error('Origin and destination postal codes are required');
  if (packageWeightKg <= 0) throw new Error('Package weight is required');
  if (input.packages.some((item) => !item.lengthCm || !item.widthCm || !item.heightCm)) throw new Error('Package dimensions are required');
  return { ...input, packageWeightKg };
}

export async function quoteShipping(tenantId, rawInput) {
  const input = normalizeShippingRequest(rawInput);
  const configs = await prisma.tenantShippingConfig.findMany({ where: { tenantId, enabled: true } });
  const activeConfigs = configs.length ? configs : [{ provider: 'MOCK', handlingFeeCents: 0, markupBasisPoints: 0, flatRateCents: null, settingsJson: {} }];
  const cacheKey = crypto.createHash('sha256').update(JSON.stringify({ tenantId, input, providers: activeConfigs.map((row) => row.provider) })).digest('hex');
  const cached = await prisma.shippingQuote.findMany({ where: { tenantId, cacheKey, expiresAt: { gt: new Date() } }, orderBy: { totalCents: 'asc' } });
  if (cached.length) return cached;
  const rows = [];
  for (const config of activeConfigs) {
    const adapter = carriers[config.provider];
    if (!adapter) continue;
    try {
      const quotes = await Promise.race([adapter({ ...input, config }), new Promise((_, reject) => setTimeout(() => reject(new Error(`${config.provider} timed out`)), 8000))]);
      for (const quote of quotes) {
        const markup = Math.round(quote.rateCents * Number(config.markupBasisPoints || 0) / 10000);
        const handling = Number(config.handlingFeeCents || 0) + markup;
        rows.push(await prisma.shippingQuote.create({ data: { tenantId, cacheKey, provider: config.provider, serviceName: quote.serviceName, serviceCode: quote.serviceCode, rateCents: quote.rateCents, handlingFeeCents: handling, totalCents: quote.rateCents + handling, currency: input.currency.toLowerCase(), estimatedTransitDays: quote.estimatedTransitDays, expiresAt: new Date(Date.now() + 10 * 60 * 1000), requestSnapshotJson: input, responseSnapshotJson: quote } }));
      }
    } catch (error) { console.error(`Shipping provider ${config.provider} unavailable: ${error.code || error.message}`); }
  }
  if (!rows.length) throw new Error('No shipping service is currently available. Contact the store for delivery options.');
  return rows.sort((a, b) => a.totalCents - b.totalCents);
}
