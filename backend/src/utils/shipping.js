export function calculateCanadaShipping(items = []) {
  const totalWeight = items.reduce((sum, item) => {
    const weight = Number(item.weightKg || 0);
    return sum + weight * Number(item.quantity || 0);
  }, 0);

  let shippingCents = 0;
  if (totalWeight <= 0) shippingCents = 0;
  else if (totalWeight <= 5) shippingCents = 1499;
  else if (totalWeight <= 15) shippingCents = 2499;
  else if (totalWeight <= 30) shippingCents = 3999;
  else shippingCents = 5999 + Math.ceil((totalWeight - 30) / 10) * 1200;

  return {
    totalWeightKg: Number(totalWeight.toFixed(2)),
    shippingCents,
    method: 'CANADA_WEIGHT_BASED_PHASE1'
  };
}

export function calculateShipping({ country = 'CA', items = [] }) {
  if (country === 'CA') {
    return {
      ...calculateCanadaShipping(items),
      placeholder: false
    };
  }

  return {
    totalWeightKg: items.reduce((sum, item) => sum + Number(item.weightKg || 0) * Number(item.quantity || 0), 0),
    shippingCents: 0,
    method: 'US_DROPSHIPPING_PLACEHOLDER',
    placeholder: true,
    message: 'US shipping placeholder only in Phase 1. Dropshipping logic will be added later.'
  };
}
