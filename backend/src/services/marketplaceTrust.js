import { prisma } from '../db/prisma.js';

export async function calculateTrustScore(userId, client = prisma) {
  const [user, reviews, disputes, completed] = await Promise.all([
    client.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true, createdAt: true, role: true } }),
    client.review.aggregate({ where: { revieweeUserId: userId, moderationStatus: 'PUBLISHED' }, _avg: { rating: true }, _count: true }),
    client.dispute.count({ where: { againstUserId: userId, status: { notIn: ['RESOLVED'] } } }),
    client.marketplaceLoad.count({ where: { OR: [{ carrierId: userId }, { brokerId: userId }], status: 'COMPLETED' } })
  ]);
  if (!user) throw new Error('User not found');
  const rating = Number(reviews._avg.rating || 0);
  const accountAgeDays = Math.floor((Date.now() - user.createdAt.getTime()) / 86400000);
  const publicFactors = { rating, reviewCount: reviews._count, completedLoads: completed, accountAgeDays, emailVerified: Boolean(user.emailVerifiedAt) };
  const privateFactors = { openDisputes: disputes };
  let score = 35 + Math.min(20, completed * 2) + Math.min(15, accountAgeDays / 30) + (user.emailVerifiedAt ? 10 : 0) + Math.round(rating * 4) - disputes * 20;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const riskBand = score >= 80 ? 'LOW_RISK' : score >= 60 ? 'MODERATE_RISK' : score >= 40 ? 'ELEVATED_RISK' : score >= 20 ? 'HIGH_RISK' : 'REVIEW_REQUIRED';
  const latest = await client.marketplaceTrustScore.findFirst({ where: { userId }, orderBy: { version: 'desc' } });
  return client.marketplaceTrustScore.create({ data: { userId, score, riskBand, version: (latest?.version || 0) + 1, publicFactorsJson: publicFactors, privateFactorsJson: privateFactors, triggeredRulesJson: disputes ? ['OPEN_DISPUTE'] : [], payoutHold: disputes > 0 || riskBand === 'REVIEW_REQUIRED' } });
}
