import { prisma } from '../db/prisma.js';

const DEFAULT_FEES = {
  MARKETPLACE_USER: { percentageBps: 800, fixedFeeCents: 0, minimumFeeCents: 500 },
  BROKER: { percentageBps: 500, fixedFeeCents: 0, minimumFeeCents: 500 },
  CARRIER: { percentageBps: 500, fixedFeeCents: 0, minimumFeeCents: 500 },
  TENANT_ADMIN: { percentageBps: 400, fixedFeeCents: 0, minimumFeeCents: 500 }
};

export async function resolveMarketplaceFee({ accountType, currency = 'cad', at = new Date(), client = prisma }) {
  const rule = await client.marketplaceFeeRule.findFirst({
    where: { accountType, currency: currency.toLowerCase(), isActive: true, effectiveAt: { lte: at }, OR: [{ expiresAt: null }, { expiresAt: { gt: at } }] },
    orderBy: [{ effectiveAt: 'desc' }, { version: 'desc' }]
  });
  const fallback = DEFAULT_FEES[accountType] || DEFAULT_FEES.CARRIER;
  return rule || { id: 'system-default', scopeKey: `DEFAULT:${accountType}`, version: 1, currency: currency.toLowerCase(), maximumFeeCents: null, taxTreatment: 'EXCLUSIVE', refundTreatment: 'PRO_RATA', ...fallback };
}

export function calculateMarketplaceSplit(grossCents, rule) {
  const percentage = Math.round(grossCents * rule.percentageBps / 10000);
  let platformFeeCents = percentage + rule.fixedFeeCents;
  platformFeeCents = Math.max(platformFeeCents, rule.minimumFeeCents);
  if (rule.maximumFeeCents != null) platformFeeCents = Math.min(platformFeeCents, rule.maximumFeeCents);
  platformFeeCents = Math.min(platformFeeCents, grossCents);
  return { grossCents, platformFeeCents, providerNetCents: grossCents - platformFeeCents };
}

export function feeRuleSnapshot(rule) {
  return { id: rule.id, scopeKey: rule.scopeKey, version: rule.version, accountType: rule.accountType, percentageBps: rule.percentageBps, fixedFeeCents: rule.fixedFeeCents, minimumFeeCents: rule.minimumFeeCents, maximumFeeCents: rule.maximumFeeCents, currency: rule.currency, taxTreatment: rule.taxTreatment, refundTreatment: rule.refundTreatment, effectiveAt: rule.effectiveAt || null };
}

export function payoutIsEligible(profile) {
  return Boolean(profile && profile.identityVerified && profile.businessVerified && profile.insuranceVerified && profile.connectedAccountId && ['VERIFIED', 'PAYOUTS_ENABLED'].includes(profile.status));
}
