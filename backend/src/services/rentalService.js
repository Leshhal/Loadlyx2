export function validateRentalDates({ moveDate, deliveryDate, pickupDate }) {
  const move = new Date(moveDate); const delivery = new Date(deliveryDate); const pickup = new Date(pickupDate);
  if ([move,delivery,pickup].some(value=>Number.isNaN(value.getTime()))) throw new Error('Valid move, delivery, and pickup dates are required');
  if (delivery >= move) throw new Error('Delivery must be before the move');
  if (pickup <= move) throw new Error('Pickup must be after the move');
  return { move, delivery, pickup };
}

export function calculateRentalPrice({ weeklyRateCents, minimumRentalWeeks=2, minimumChargeCents, rentalWeeks, packageQuantity=1 }) {
  if (!Number.isInteger(rentalWeeks) || rentalWeeks < minimumRentalWeeks) throw new Error(`A minimum of ${minimumRentalWeeks} rental weeks is required`);
  const minimum = Number(minimumChargeCents ?? weeklyRateCents * minimumRentalWeeks);
  return Math.max(minimum, Number(weeklyRateCents) * rentalWeeks) * packageQuantity;
}

export function hasRentalCapacity({ inventoryUnits, alreadyReservedUnits, requestedUnits }) { return Number(alreadyReservedUnits) + Number(requestedUnits) <= Number(inventoryUnits); }
