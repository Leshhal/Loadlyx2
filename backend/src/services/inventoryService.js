export function availableStock({ onHand, reserved }) { return Math.max(0, Number(onHand) - Number(reserved)); }

export function applyInventoryMovement(stock, type, quantity) {
  const amount = Number(quantity);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('Inventory quantity must be a positive integer');
  const next = { onHand: Number(stock.onHand), reserved: Number(stock.reserved) };
  if (['RECEIPT','RETURN','TRANSFER_IN'].includes(type)) next.onHand += amount;
  else if (type === 'RESERVATION') next.reserved += amount;
  else if (type === 'RELEASE') next.reserved -= amount;
  else if (['SALE','TRANSFER_OUT','DAMAGE'].includes(type)) next.onHand -= amount;
  else if (type === 'ADJUSTMENT') next.onHand += amount;
  else throw new Error(`Unsupported inventory movement: ${type}`);
  if (next.onHand < 0 || next.reserved < 0 || next.reserved > next.onHand) throw new Error('Inventory movement would violate stock invariants');
  return { ...next, available: availableStock(next) };
}
