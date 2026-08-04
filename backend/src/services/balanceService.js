export async function getTenantBalance(db, tenantId) {
  const [credits, debits, pendingWithdrawals] = await Promise.all([
    db.ledgerEntry.aggregate({ where: { tenantId, account: 'TENANT', direction: 'CREDIT' }, _sum: { amountCents: true } }),
    db.ledgerEntry.aggregate({ where: { tenantId, account: 'TENANT', direction: 'DEBIT' }, _sum: { amountCents: true } }),
    db.withdrawalRequest.aggregate({ where: { tenantId, status: { in: ['pending', 'approved'] } }, _sum: { amountCents: true } })
  ]);
  const earnedCents = credits._sum.amountCents || 0;
  const debitedCents = debits._sum.amountCents || 0;
  const reservedCents = pendingWithdrawals._sum.amountCents || 0;
  return {
    earnedCents,
    debitedCents,
    reservedCents,
    availableCents: Math.max(0, earnedCents - debitedCents - reservedCents)
  };
}
