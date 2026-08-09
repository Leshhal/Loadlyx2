import { calculateMarketplaceAllocation, calculateStoreAllocation } from './moneyFlow.js';
import { getSubscriptionPlan } from '../config/plans.js';

export async function getCommissionPolicy(db, tenantId) {
  const tenantPolicy = tenantId
    ? await db.commissionPolicy.findUnique({ where: { tenantId } })
    : null;
  if (tenantPolicy) return tenantPolicy;
  const globalPolicy = await db.commissionPolicy.findUnique({ where: { scopeKey: 'GLOBAL' } });
  if (globalPolicy) return globalPolicy;
  if (tenantId) {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { subscriptionPlan: true, subscription: { select: { planCode: true } } } });
    const plan = getSubscriptionPlan(tenant?.subscription?.planCode || tenant?.subscriptionPlan || 'STARTER');
    if (plan) return { storeCommissionBps: plan.commissionBps, marketplaceCommissionBps: plan.commissionBps, minimumMarketplaceFeeCents: 0, source: `PLAN:${plan.code}` };
  }
  return { storeCommissionBps: 650, marketplaceCommissionBps: 650, minimumMarketplaceFeeCents: 0, source: 'STARTER_FALLBACK' };
}

function entry(transactionId, suffix, data) {
  return { transactionId, idempotencyKey: `${transactionId}:${suffix}`, ...data };
}

export async function recordStoreSettlement(db, order, options = {}) {
  const idempotencyKey = `store:${order.id}:paid`;
  const existing = await db.financialTransaction.findUnique({ where: { idempotencyKey }, include: { ledgerEntries: true } });
  if (existing) return existing;

  const policy = await getCommissionPolicy(db, order.tenantId);
  const commissionBps = Number.isInteger(options.commissionBps) ? options.commissionBps : policy.storeCommissionBps;
  const allocation = calculateStoreAllocation({
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    taxCents: options.taxCents || 0,
    discountCents: options.discountCents || 0,
    processorFeeCents: options.processorFeeCents || 0,
    commissionBps
  });
  const { commissionBps: _commissionBps, shippingCents: _shippingCents, subtotalCents: _subtotalCents, ...storedAllocation } = allocation;

  const transaction = await db.financialTransaction.create({
    data: {
      idempotencyKey,
      tenantId: order.tenantId,
      kind: 'STORE_SALE',
      status: 'AVAILABLE',
      referenceType: 'ORDER',
      referenceId: order.id,
      currency: order.currency,
      ...storedAllocation,
      availableAt: new Date(),
      metadataJson: { commissionPolicyId: policy.id || null, commissionBps, stripePaymentIntentId: order.stripePaymentIntentId || null }
    }
  });

  await db.ledgerEntry.createMany({
    data: [
      entry(transaction.id, 'customer-debit', { account: 'CUSTOMER', entryType: 'TENANT_PROCEEDS', direction: 'DEBIT', amountCents: allocation.grossCents, currency: order.currency }),
      entry(transaction.id, 'tax-credit', { account: 'TAX_PAYABLE', entryType: 'TAX', direction: 'CREDIT', amountCents: allocation.taxCents, currency: order.currency }),
      entry(transaction.id, 'processor-credit', { account: 'PROCESSOR', entryType: 'PROCESSOR_FEE', direction: 'CREDIT', amountCents: allocation.processorFeeCents, currency: order.currency }),
      entry(transaction.id, 'platform-credit', { account: 'PLATFORM', entryType: 'STORE_COMMISSION', direction: 'CREDIT', amountCents: allocation.platformCommissionCents, currency: order.currency }),
      entry(transaction.id, 'tenant-credit', { tenantId: order.tenantId, account: 'TENANT', entryType: 'TENANT_PROCEEDS', direction: 'CREDIT', amountCents: allocation.tenantProceedsCents, currency: order.currency })
    ]
  });
  return db.financialTransaction.findUnique({ where: { id: transaction.id }, include: { ledgerEntries: true } });
}

export async function recordMarketplaceSettlement(db, deal) {
  const idempotencyKey = `marketplace:${deal.id}:paid`;
  const existing = await db.financialTransaction.findUnique({ where: { idempotencyKey }, include: { ledgerEntries: true } });
  if (existing) return existing;
  const policy = await getCommissionPolicy(db, deal.tenantId || null);
  const calculatedAllocation = calculateMarketplaceAllocation({
    grossCents: deal.grossCents,
    taxCents: deal.taxCents || 0,
    processorFeeCents: deal.processorFeeCents || 0,
    platformCommissionBps: policy.marketplaceCommissionBps,
    brokerMarginBps: deal.brokerMarginBps || 0,
    minimumPlatformFeeCents: policy.minimumMarketplaceFeeCents
  });
  const allocation = deal.platformFeeCents == null ? calculatedAllocation : {
    ...calculatedAllocation,
    platformCommissionCents: deal.platformFeeCents,
    brokerMarginCents: deal.brokerMarginCents || 0,
    providerProceedsCents: deal.providerNetCents,
    netCents: deal.providerNetCents
  };
  const { platformCommissionBps: _platformCommissionBps, brokerMarginBps: _brokerMarginBps, ...storedAllocation } = allocation;
  const currency = deal.currency || 'cad';
  const transaction = await db.financialTransaction.create({ data: {
    idempotencyKey, tenantId: deal.tenantId || null, kind: 'MARKETPLACE_DEAL', status: 'AVAILABLE',
    referenceType: 'MARKETPLACE_DEAL', referenceId: deal.id, currency, ...storedAllocation, availableAt: new Date(),
    metadataJson: { brokerUserId: deal.brokerUserId || null, carrierUserId: deal.carrierUserId || null, commissionPolicyId: policy.id || null, commissionBps: policy.marketplaceCommissionBps }
  } });
  await db.ledgerEntry.createMany({ data: [
    entry(transaction.id, 'customer-debit', { account: 'CUSTOMER', entryType: 'CARRIER_PROCEEDS', direction: 'DEBIT', amountCents: allocation.grossCents, currency }),
    entry(transaction.id, 'tax-credit', { account: 'TAX_PAYABLE', entryType: 'TAX', direction: 'CREDIT', amountCents: allocation.taxCents, currency }),
    entry(transaction.id, 'processor-credit', { account: 'PROCESSOR', entryType: 'PROCESSOR_FEE', direction: 'CREDIT', amountCents: allocation.processorFeeCents, currency }),
    entry(transaction.id, 'platform-credit', { account: 'PLATFORM', entryType: 'MARKETPLACE_COMMISSION', direction: 'CREDIT', amountCents: allocation.platformCommissionCents, currency }),
    entry(transaction.id, 'broker-credit', { account: 'BROKER', entryType: 'BROKER_MARGIN', direction: 'CREDIT', amountCents: allocation.brokerMarginCents, currency }),
    entry(transaction.id, 'carrier-credit', { account: 'CARRIER', entryType: 'CARRIER_PROCEEDS', direction: 'CREDIT', amountCents: allocation.providerProceedsCents, currency })
  ] });
  return db.financialTransaction.findUnique({ where: { id: transaction.id }, include: { ledgerEntries: true } });
}

export async function recordSubscriptionPayment(db, subscription, referenceId) {
  const idempotencyKey = `subscription:${subscription.id}:${referenceId}`;
  const existing = await db.financialTransaction.findUnique({ where: { idempotencyKey }, include: { ledgerEntries: true } });
  if (existing) return existing;
  const transaction = await db.financialTransaction.create({ data: {
    idempotencyKey, tenantId: subscription.tenantId, kind: 'SAAS_SUBSCRIPTION', status: 'SETTLED',
    referenceType: 'SUBSCRIPTION_INVOICE', referenceId, currency: subscription.currency,
    grossCents: subscription.monthlyPriceCents, platformCommissionCents: subscription.monthlyPriceCents,
    settledAt: new Date()
  } });
  await db.ledgerEntry.createMany({ data: [
    entry(transaction.id, 'tenant-debit', { tenantId: subscription.tenantId, account: 'TENANT', entryType: 'SAAS_REVENUE', direction: 'DEBIT', amountCents: subscription.monthlyPriceCents, currency: subscription.currency }),
    entry(transaction.id, 'platform-credit', { account: 'PLATFORM', entryType: 'SAAS_REVENUE', direction: 'CREDIT', amountCents: subscription.monthlyPriceCents, currency: subscription.currency })
  ] });
  return db.financialTransaction.findUnique({ where: { id: transaction.id }, include: { ledgerEntries: true } });
}

export async function recordRefund(db, originalTransaction, amountCents, reason, idempotencySuffix) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > originalTransaction.grossCents) {
    throw new RangeError('refund amount must be positive and cannot exceed the original gross amount');
  }
  const idempotencyKey = `refund:${originalTransaction.id}:${idempotencySuffix}`;
  const existing = await db.financialTransaction.findUnique({ where: { idempotencyKey }, include: { ledgerEntries: true } });
  if (existing) return existing;

  const originalCredits = originalTransaction.ledgerEntries
    .filter((item) => item.direction === 'CREDIT' && item.amountCents > 0)
    .sort((a, b) => a.amountCents - b.amountCents);
  let remaining = amountCents;
  const reversedCredits = originalCredits.map((item, index) => {
    const allocated = index === originalCredits.length - 1
      ? remaining
      : Math.min(remaining, Math.floor((amountCents * item.amountCents) / originalTransaction.grossCents));
    remaining -= allocated;
    return { item, amountCents: allocated };
  }).filter((item) => item.amountCents > 0);

  const sumType = (entryType) => reversedCredits.filter(({ item }) => item.entryType === entryType).reduce((sum, item) => sum + item.amountCents, 0);
  const transaction = await db.financialTransaction.create({ data: {
    idempotencyKey, tenantId: originalTransaction.tenantId, kind: 'REFUND', status: 'SETTLED',
    referenceType: 'FINANCIAL_TRANSACTION', referenceId: originalTransaction.id, currency: originalTransaction.currency,
    grossCents: amountCents,
    taxCents: sumType('TAX'),
    processorFeeCents: sumType('PROCESSOR_FEE'),
    platformCommissionCents: sumType('STORE_COMMISSION') + sumType('MARKETPLACE_COMMISSION'),
    brokerMarginCents: sumType('BROKER_MARGIN'),
    tenantProceedsCents: sumType('TENANT_PROCEEDS'),
    providerProceedsCents: sumType('CARRIER_PROCEEDS'),
    metadataJson: { reason }, settledAt: new Date()
  } });
  await db.ledgerEntry.createMany({ data: [
    entry(transaction.id, 'customer-credit', { account: 'CUSTOMER', entryType: 'REFUND', direction: 'CREDIT', amountCents, currency: originalTransaction.currency, metadataJson: { reason } }),
    ...reversedCredits.map(({ item, amountCents: reversedAmount }, index) => entry(transaction.id, `reversal-${index}`, {
      tenantId: item.tenantId, account: item.account, entryType: 'REFUND', direction: 'DEBIT', amountCents: reversedAmount,
      currency: originalTransaction.currency, metadataJson: { originalLedgerEntryId: item.id, originalEntryType: item.entryType, reason }
    }))
  ] });
  return db.financialTransaction.findUnique({ where: { id: transaction.id }, include: { ledgerEntries: true } });
}

export async function recordPayout(db, withdrawal, paymentReference) {
  const idempotencyKey = `payout:${withdrawal.id}:${paymentReference}`;
  const existing = await db.financialTransaction.findUnique({ where: { idempotencyKey }, include: { ledgerEntries: true } });
  if (existing) return existing;
  const transaction = await db.financialTransaction.create({ data: {
    idempotencyKey, tenantId: withdrawal.tenantId, kind: 'PAYOUT', status: 'SETTLED',
    referenceType: 'WITHDRAWAL', referenceId: withdrawal.id, grossCents: withdrawal.amountCents,
    tenantProceedsCents: withdrawal.amountCents, settledAt: new Date(), metadataJson: { paymentReference }
  } });
  await db.ledgerEntry.createMany({ data: [
    entry(transaction.id, 'tenant-debit', { tenantId: withdrawal.tenantId, account: 'TENANT', entryType: 'PAYOUT', direction: 'DEBIT', amountCents: withdrawal.amountCents, currency: 'cad' }),
    entry(transaction.id, 'processor-credit', { account: 'PROCESSOR', entryType: 'PAYOUT', direction: 'CREDIT', amountCents: withdrawal.amountCents, currency: 'cad', metadataJson: { paymentReference } })
  ] });
  return db.financialTransaction.findUnique({ where: { id: transaction.id }, include: { ledgerEntries: true } });
}
