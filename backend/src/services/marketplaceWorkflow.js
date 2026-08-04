const POSTER_ROLES = new Set(['MARKETPLACE_USER', 'BROKER', 'TENANT_ADMIN', 'TENANT_STAFF', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN']);
const BIDDER_ROLES = new Set(['BROKER', 'CARRIER']);

export function canPostLoad(role) { return POSTER_ROLES.has(role); }
export function canBid(role) { return BIDDER_ROLES.has(role); }
export function canManageLoad(user, load) { return ['SUPER_ADMIN','PLATFORM_ADMIN','ADMIN'].includes(user.role) || load.posterId === user.userId || load.brokerId === user.userId; }
export function canAccessLoadConversation(user, load) { return canManageLoad(user, load) || load.carrierId === user.userId || load.bids?.some((bid) => bid.bidderId === user.userId); }

const TRANSITIONS = {
  DRAFT: ['POSTED', 'CANCELED'], POSTED: ['BIDDING', 'AWARDED', 'CANCELED'], BIDDING: ['AWARDED', 'CANCELED'],
  AWARDED: ['FUNDED', 'CANCELED', 'DISPUTED'], FUNDED: ['PICKED_UP', 'DISPUTED'], PICKED_UP: ['IN_TRANSIT', 'DISPUTED'],
  IN_TRANSIT: ['DELIVERED', 'DISPUTED'], DELIVERED: ['COMPLETED', 'DISPUTED'], COMPLETED: [], CANCELED: [], DISPUTED: []
};
export function assertMarketplaceTransition(from, to) {
  if (!(TRANSITIONS[from] || []).includes(to)) throw new Error(`Invalid marketplace load transition: ${from} to ${to}`);
  return to;
}
