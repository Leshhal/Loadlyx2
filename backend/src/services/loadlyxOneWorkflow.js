const CAPACITY_ROLES = new Set(['CARRIER', 'DRIVER', 'TENANT_ADMIN', 'TENANT_STAFF']);
const TRUCK_SEARCH_ROLES = new Set(['BROKER', 'TENANT_ADMIN', 'TENANT_STAFF', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'SUPPORT']);

export function canPostTruck(role) { return CAPACITY_ROLES.has(role); }
export function canSearchTrucks(role) { return TRUCK_SEARCH_ROLES.has(role); }
export function canDrive(role) { return role === 'DRIVER'; }

const ASSIGNMENT_TRANSITIONS = {
  ASSIGNMENT_PENDING: ['DRIVER_ACCEPTED', 'DRIVER_DECLINED'],
  DRIVER_ACCEPTED: ['EN_ROUTE_PICKUP'],
  DRIVER_DECLINED: [],
  EN_ROUTE_PICKUP: ['ARRIVED_PICKUP'],
  ARRIVED_PICKUP: ['LOADED'],
  LOADED: ['IN_TRANSIT'],
  IN_TRANSIT: ['ARRIVED_DELIVERY'],
  ARRIVED_DELIVERY: ['DELIVERED'],
  DELIVERED: ['POD_PENDING', 'COMPLETE'],
  POD_PENDING: ['COMPLETE'],
  COMPLETE: []
};

export function assertAssignmentTransition(from, to) {
  if (!(ASSIGNMENT_TRANSITIONS[from] || []).includes(to)) throw new Error(`Invalid freight assignment transition: ${from} to ${to}`);
  return to;
}

export function trackingIsAllowed({ assignment, driverId, profile, now = new Date() }) {
  if (!assignment || assignment.driverId !== driverId) return false;
  if (!profile?.trackingConsentAt || profile.trackingRevokedAt) return false;
  if (['ASSIGNMENT_PENDING', 'DRIVER_DECLINED', 'COMPLETE'].includes(assignment.status)) return false;
  return profile.trackingConsentAt <= now;
}

export function publicTrackingPoint(point) {
  if (!point) return null;
  const round = (value) => Math.round(Number(value) * 100) / 100;
  return { latitude: round(point.latitude), longitude: round(point.longitude), eta: point.eta || null, capturedAt: point.capturedAt };
}

export function publicTrustProfile({ reviews = {}, completedLoads = 0, pickupOnTime = 0, deliveryOnTime = 0, cancellations = 0, badges = [] }) {
  const completed = Math.max(0, completedLoads);
  const pct = (value) => completed ? Math.round((Math.max(0, value) / completed) * 1000) / 10 : 0;
  return {
    rating: Number(reviews.average || 0),
    reviewCount: Number(reviews.count || 0),
    completedLoads: completed,
    onTimePickupPercent: pct(pickupOnTime),
    onTimeDeliveryPercent: pct(deliveryOnTime),
    cancellationRatePercent: pct(cancellations),
    verificationBadges: badges
  };
}

export function calculateRatePerMile(amountCents, distanceKm) {
  const miles = Number(distanceKm || 0) * 0.621371;
  return miles > 0 ? Math.round(Number(amountCents || 0) / miles) : null;
}
