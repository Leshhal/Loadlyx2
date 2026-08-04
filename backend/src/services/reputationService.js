export function aggregateRatings(reviews = []) {
  const published = reviews.filter((review) => review.moderationStatus === 'PUBLISHED');
  if (!published.length) return { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  for (const review of published) {
    const rating = Number(review.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) continue;
    distribution[rating] += 1;
    total += rating;
  }
  const count = Object.values(distribution).reduce((sum, value) => sum + value, 0);
  return { average: count ? Math.round((total / count) * 10) / 10 : 0, count, distribution };
}

export async function verifyReviewTransaction(prisma, { transactionType, transactionId, user }) {
  if (transactionType === 'STORE_ORDER') {
    const order = await prisma.order.findUnique({ where: { id: transactionId } });
    if (!order || !['PAID', 'FULFILLED'].includes(order.status)) return { verified: false };
    const isCustomer = order.customerEmail.toLowerCase() === user.email.toLowerCase();
    const isTenantParticipant = Boolean(user.tenantId && user.tenantId === order.tenantId);
    return { verified: isCustomer || isTenantParticipant, tenantId: order.tenantId };
  }
  if (transactionType === 'MARKETPLACE_LOAD') {
    const load = await prisma.load.findUnique({ where: { id: transactionId }, include: { quote: true } });
    if (load?.status === 'COMPLETED') {
      const isCustomer = load.quote?.email?.toLowerCase() === user.email.toLowerCase();
      const isTenantParticipant = Boolean(user.tenantId && user.tenantId === load.tenantId);
      return { verified: isCustomer || isTenantParticipant, tenantId: load.tenantId };
    }
    if (prisma.marketplaceLoad) {
      const marketplaceLoad = await prisma.marketplaceLoad.findUnique({ where: { id: transactionId } });
      if (marketplaceLoad?.status === 'COMPLETED') {
        const participant = [marketplaceLoad.posterId, marketplaceLoad.brokerId, marketplaceLoad.carrierId].filter(Boolean).includes(user.id);
        return { verified: participant, tenantId: user.tenantId || null };
      }
    }
    return { verified: false };
  }
  return { verified: false };
}
