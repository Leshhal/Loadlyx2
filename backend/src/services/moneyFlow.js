function cents(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${field} must be a non-negative integer`);
  return value;
}

function basisPoints(value, field) {
  if (!Number.isInteger(value) || value < 0 || value > 10000) throw new TypeError(`${field} must be between 0 and 10000 basis points`);
  return value;
}

function percentage(amountCents, rateBps) {
  return Math.round((amountCents * rateBps) / 10000);
}

export function calculateStoreAllocation(input) {
  const subtotalCents = cents(input.subtotalCents, 'subtotalCents');
  const shippingCents = cents(input.shippingCents || 0, 'shippingCents');
  const taxCents = cents(input.taxCents || 0, 'taxCents');
  const discountCents = cents(input.discountCents || 0, 'discountCents');
  const processorFeeCents = cents(input.processorFeeCents || 0, 'processorFeeCents');
  const commissionBps = basisPoints(input.commissionBps, 'commissionBps');
  if (discountCents > subtotalCents) throw new RangeError('discountCents cannot exceed subtotalCents');

  const commissionableCents = subtotalCents - discountCents;
  const grossCents = commissionableCents + shippingCents + taxCents;
  const platformCommissionCents = percentage(commissionableCents, commissionBps);
  const tenantProceedsCents = grossCents - taxCents - processorFeeCents - platformCommissionCents;
  if (tenantProceedsCents < 0) throw new RangeError('fees exceed the store transaction amount');

  return {
    grossCents,
    subtotalCents,
    shippingCents,
    taxCents,
    discountCents,
    processorFeeCents,
    platformCommissionCents,
    tenantProceedsCents,
    commissionBps
  };
}

export function calculateMarketplaceAllocation(input) {
  const grossCents = cents(input.grossCents, 'grossCents');
  const taxCents = cents(input.taxCents || 0, 'taxCents');
  const processorFeeCents = cents(input.processorFeeCents || 0, 'processorFeeCents');
  const platformCommissionBps = basisPoints(input.platformCommissionBps, 'platformCommissionBps');
  const brokerMarginBps = basisPoints(input.brokerMarginBps || 0, 'brokerMarginBps');
  const minimumPlatformFeeCents = cents(input.minimumPlatformFeeCents || 0, 'minimumPlatformFeeCents');
  if (taxCents > grossCents) throw new RangeError('taxCents cannot exceed grossCents');

  const commissionableCents = grossCents - taxCents;
  const platformCommissionCents = Math.max(minimumPlatformFeeCents, percentage(commissionableCents, platformCommissionBps));
  const brokerMarginCents = percentage(commissionableCents, brokerMarginBps);
  const providerProceedsCents = grossCents - taxCents - processorFeeCents - platformCommissionCents - brokerMarginCents;
  if (providerProceedsCents < 0) throw new RangeError('fees and margins exceed the marketplace transaction amount');

  return {
    grossCents,
    taxCents,
    processorFeeCents,
    platformCommissionCents,
    brokerMarginCents,
    providerProceedsCents,
    platformCommissionBps,
    brokerMarginBps
  };
}

export function assertAllocationBalances(allocation, fields) {
  const allocated = fields.reduce((sum, field) => sum + allocation[field], 0);
  if (allocated !== allocation.grossCents) throw new Error(`allocation does not balance: ${allocated} !== ${allocation.grossCents}`);
  return true;
}
