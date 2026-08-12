const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const round = (value, digits = 1) => Number(number(value).toFixed(digits));
const kmToMiles = (km) => number(km) * 0.621371;
const percentile = (values, p) => { const sorted = values.map(Number).filter(Number.isFinite).sort((a,b) => a-b); if (!sorted.length) return null; const index = (sorted.length - 1) * p; const lower = Math.floor(index); const upper = Math.ceil(index); return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower); };

export const INTELLIGENCE_MODEL = Object.freeze({ name: 'loadlyx-freight-intelligence', version: '2.0.0', decisionMode: 'EXPLAINABLE_RULES', bindingAuthority: false });
export const DATA_SOURCES = Object.freeze({ network: 'LOADLYX_NETWORK_DATA', thirdParty: 'THIRD_PARTY_DATA' });

export function calculateDeadhead({ deadheadKm, loadedKm, costPerKm = 0, fuelPricePerLitre = 0, fuelEconomyLPer100Km = 0, driverCostPerKm = 0, maintenancePerKm = 0 }) {
  const deadhead = Math.max(0, number(deadheadKm)); const loaded = Math.max(0, number(loadedKm)); const total = deadhead + loaded;
  const fuelPerKm = number(fuelPricePerLitre) * number(fuelEconomyLPer100Km) / 100;
  const resolvedCostPerKm = number(costPerKm) || fuelPerKm + number(driverCostPerKm) + number(maintenancePerKm);
  return { deadheadKm: round(deadhead), loadedKm: round(loaded), totalTripKm: round(total), deadheadPercent: total ? round(deadhead / total * 100) : 0, operatingCostPerKm: round(resolvedCostPerKm, 3), deadheadCostCents: Math.round(deadhead * resolvedCostPerKm * 100), estimatedTripCostCents: Math.round(total * resolvedCostPerKm * 100) };
}

function compatibility(load, truck) {
  const reasons = []; let points = 0;
  const equipment = String(load.equipmentType || '').toLowerCase(); const truckEquipment = String(truck.equipmentType || '').toLowerCase();
  let equipmentEligible = true;
  if (!equipment || !truckEquipment) { points += 8; reasons.push('Equipment compatibility requires confirmation'); }
  else if (equipment === truckEquipment || equipment.includes(truckEquipment) || truckEquipment.includes(equipment)) { points += 20; reasons.push('Correct equipment'); }
  else { equipmentEligible = false; reasons.push('Equipment mismatch'); }
  const needed = number(load.weightKg); const capacity = number(truck.capacityKg);
  if (!needed || !capacity) { points += 5; reasons.push('Capacity data incomplete'); }
  else if (capacity >= needed) { points += 10; reasons.push('Capacity supports the load'); } else reasons.push('Insufficient capacity');
  return { points, reasons, eligible: equipmentEligible && !(needed && capacity && capacity < needed) };
}

export function scoreTruckForLoad(load, truck, options = {}) {
  const fit = compatibility(load, truck); if (!fit.eligible) return { truckId: truck.id, eligible: false, score: 0, reasons: fit.reasons, model: INTELLIGENCE_MODEL };
  let score = fit.points; const reasons = [...fit.reasons]; const missing = [];
  const deadheadKm = Number.isFinite(Number(options.deadheadKm ?? truck.deadheadKm)) ? Number(options.deadheadKm ?? truck.deadheadKm) : null;
  const maximum = number(truck.maximumDeadheadKm, 150);
  if (deadheadKm == null) missing.push('deadhead distance'); else if (deadheadKm <= Math.min(25, maximum)) { score += 20; reasons.push(`${round(deadheadKm)} km deadhead`); } else if (deadheadKm <= maximum) { score += 12; reasons.push(`Deadhead is within the ${round(maximum)} km limit`); } else { score -= 20; reasons.push('Deadhead exceeds preferred limit'); }
  const availableAt = truck.availableAt ? new Date(truck.availableAt) : null; const pickup = load.pickupDate ? new Date(load.pickupDate) : null;
  if (availableAt && pickup && availableAt <= pickup) { score += 15; reasons.push('Available before pickup'); } else if (availableAt && pickup) { score -= 20; reasons.push('Availability conflicts with pickup'); } else missing.push('pickup compatibility');
  const destination = String(load.destinationCity || '').toLowerCase(); const desired = String(truck.desiredDestination || '').toLowerCase(); const terminal = String(truck.homeTerminal || '').toLowerCase();
  if (desired && destination.includes(desired)) { score += 10; reasons.push('Matches destination preference'); }
  if (terminal && destination.includes(terminal)) { score += 8; reasons.push('Returns driver toward terminal'); }
  const rating = number(options.carrierRating ?? truck.carrierRating); if (rating >= 4.5) { score += 7; reasons.push('Strong verified carrier rating'); } else if (!rating) missing.push('carrier rating');
  const lanePerformance = number(options.lanePerformance); if (lanePerformance >= 0.8) { score += 6; reasons.push('Strong historical lane performance'); } else if (!lanePerformance) missing.push('lane performance');
  const trust = number(options.trustScore); if (trust >= 80) { score += 4; reasons.push('Strong trust and risk profile'); } else if (trust && trust < 40) { score -= 12; reasons.push('Risk indicators require review'); }
  const economics = calculateDeadhead({ deadheadKm: deadheadKm || 0, loadedKm: load.distanceKm, ...options.costs });
  const revenueCents = number(load.awardedAmountCents || load.budgetCents || options.offeredRateCents); const marginCents = revenueCents ? revenueCents - economics.estimatedTripCostCents : null;
  if (marginCents > 0) { score += 5; reasons.push('Estimated positive gross margin'); }
  const confidence = clamp(92 - missing.length * 12);
  return { truckId: truck.id, loadId: load.id, eligible: true, score: Math.round(clamp(score)), confidence, reasons, missingInputs: missing, economics: { ...economics, revenueCents: revenueCents || null, estimatedGrossMarginCents: marginCents, ratePerMileCents: revenueCents && load.distanceKm ? Math.round(revenueCents / kmToMiles(load.distanceKm)) : null }, explanation: reasons.join('; '), model: INTELLIGENCE_MODEL };
}

export function rankTrucksForLoad(load, trucks, optionsByTruck = {}) { return trucks.map((truck) => scoreTruckForLoad(load, truck, optionsByTruck[truck.id] || {})).filter((row) => row.eligible).sort((a,b) => b.score - a.score); }
export function rankLoadsForTruck(truck, loads, optionsByLoad = {}) { return loads.map((load) => scoreTruckForLoad(load, truck, optionsByLoad[load.id] || {})).filter((row) => row.eligible).sort((a,b) => b.score - a.score); }

export function findBackhaulOpportunities(outbound, candidates, { locationTolerance = false } = {}) {
  const destination = String(outbound.destinationCity || '').toLowerCase(); const origin = String(outbound.originCity || '').toLowerCase();
  return candidates.filter((load) => load.id !== outbound.id).map((load) => { const startsNearDestination = String(load.originCity || '').toLowerCase() === destination; const returnsHome = String(load.destinationCity || '').toLowerCase() === origin; const score = (startsNearDestination ? 55 : 0) + (returnsHome ? 35 : 0) + (load.equipmentType === outbound.equipmentType ? 10 : 0); return { load, score, reasons: [startsNearDestination ? 'Origin matches outbound destination' : locationTolerance ? 'Nearby-origin distance must be verified' : 'Origin does not match outbound destination', returnsHome ? 'Returns toward outbound origin' : 'Different return destination'].filter(Boolean) }; }).filter((row) => row.score > 0).sort((a,b) => b.score - a.score);
}

export function planMultiLegTrip(loads, { costPerKm = 0, maxDrivingHours = 13, averageSpeedKph = 80 } = {}) {
  if (!Array.isArray(loads) || !loads.length) return { legs: [], eligible: false, reason: 'No loads supplied' };
  let revenueCents = 0; let distanceKm = 0; let continuityScore = 100; const warnings = [];
  loads.forEach((load, index) => { revenueCents += number(load.awardedAmountCents || load.budgetCents); distanceKm += number(load.distanceKm); if (index && String(loads[index - 1].destinationCity).toLowerCase() !== String(load.originCity).toLowerCase()) { continuityScore -= 25; warnings.push(`Leg ${index + 1} requires an unmeasured reposition`); } });
  const drivingHours = averageSpeedKph ? distanceKm / averageSpeedKph : null; if (drivingHours > maxDrivingHours) warnings.push('Estimated driving time exceeds the configured daily driving threshold; jurisdiction-specific HOS validation is required');
  const estimatedCostCents = Math.round(distanceKm * number(costPerKm) * 100);
  return { legs: loads.map(({ id, originCity, destinationCity }) => ({ id, originCity, destinationCity })), eligible: true, score: clamp(Math.round(continuityScore + (revenueCents > estimatedCostCents ? 0 : -25))), revenueCents, distanceKm: round(distanceKm), estimatedCostCents, estimatedGrossMarginCents: revenueCents - estimatedCostCents, estimatedDrivingHours: drivingHours == null ? null : round(drivingHours), returnToTerminal: String(loads.at(-1).destinationCity).toLowerCase() === String(loads[0].originCity).toLowerCase(), warnings, hosLabel: 'OPERATIONAL_ESTIMATE_NOT_HOS_CERTIFIED' };
}

export function buildRateIntelligence(observations, { distanceKm, minimumObservations = 3 } = {}) {
  const valid = observations.filter((row) => number(row.amountCents) > 0).map((row) => ({ ...row, amountCents: number(row.amountCents) })); const accepted = valid.filter((row) => row.kind === 'ACCEPTED'); const base = accepted.length >= minimumObservations ? accepted : valid;
  const sourceBreakdown = valid.reduce((acc,row) => { const key = row.source || DATA_SOURCES.network; acc[key] = (acc[key] || 0) + 1; return acc; }, {});
  if (base.length < minimumObservations) return { status: 'INSUFFICIENT_DATA', suggestedRateCents: null, range: null, ratePerMileCents: null, confidence: 0, observations: base.length, minimumObservations, sourceBreakdown, explanation: `At least ${minimumObservations} relevant observations are required` };
  const amounts = base.map((row) => row.amountCents); const median = Math.round(percentile(amounts,.5)); const low = Math.round(percentile(amounts,.25)); const high = Math.round(percentile(amounts,.75)); const confidence = clamp(Math.round(35 + Math.min(base.length,50) * 1.2 + (accepted.length / base.length) * 20));
  const now = Date.now(); const avg = (days) => { const rows = base.filter((row) => !row.occurredAt || now - new Date(row.occurredAt).getTime() <= days * 86400000); return rows.length ? Math.round(rows.reduce((sum,row) => sum + row.amountCents,0) / rows.length) : null; }; const avg7 = avg(7); const avg30 = avg(30);
  return { status: 'AVAILABLE', suggestedRateCents: median, range: { lowCents: low, highCents: high }, ratePerMileCents: distanceKm ? Math.round(median / kmToMiles(distanceKm)) : null, networkAverage7DayCents: avg7, networkAverage30DayCents: avg30, trend: avg7 && avg30 ? (avg7 > avg30 * 1.03 ? 'UP' : avg7 < avg30 * .97 ? 'DOWN' : 'STABLE') : 'INSUFFICIENT_HISTORY', confidence, observations: base.length, acceptedObservations: accepted.length, sourceBreakdown, dataLabel: DATA_SOURCES.network };
}

export function negotiationRecommendation({ askingCents, rateIntelligence, economics, riskAdjustmentPercent = 0 }) {
  if (rateIntelligence.status !== 'AVAILABLE') return { status: 'INSUFFICIENT_DATA', requiresHumanApproval: true, confidence: 0, explanation: 'Negotiation guidance is unavailable without a supported rate sample' };
  const median = rateIntelligence.suggestedRateCents; const opening = Math.round(Math.min(number(askingCents, median), median) * .96); const target = Math.round((opening + median) / 2); const minimumProfitable = number(economics?.estimatedTripCostCents) * (1.08 + number(riskAdjustmentPercent) / 100); const walkAway = Math.round(Math.max(median * 1.12, minimumProfitable));
  return { status: 'RECOMMENDATION', openingOfferCents: opening, targetCents: target, walkAwayCents: walkAway, confidence: rateIntelligence.confidence, requiresHumanApproval: true, reasons: [`Loadlyx network median is ${median} cents`, `Based on ${rateIntelligence.observations} observations`, economics?.deadheadPercent != null ? `Deadhead impact is ${economics.deadheadPercent}%` : 'Deadhead impact unavailable'], dataLabel: DATA_SOURCES.network, model: INTELLIGENCE_MODEL };
}

export function buildMarketConditions({ loads = [], trucks = [], accepted = [] }) {
  const supply = trucks.length; const demand = loads.length; const ratio = supply ? round(demand / supply,2) : demand ? null : 0; const band = ratio == null ? 'TIGHT' : ratio < .8 ? 'LOW' : ratio <= 1.5 ? 'BALANCED' : 'TIGHT';
  return { band, truckSupply: supply, loadDemand: demand, loadToTruckRatio: ratio, medianPostedRateCents: percentile(loads.map((row) => row.budgetCents).filter(Boolean),.5), medianAcceptedRateCents: percentile(accepted.map((row) => row.amountCents).filter(Boolean),.5), dataLabel: DATA_SOURCES.network, observations: { loads: demand, trucks: supply, accepted: accepted.length } };
}

export function buildBenchmark({ subject, cohort, minimumCohort = 5 }) {
  if (cohort.length < minimumCohort) return { status: 'SUPPRESSED_FOR_PRIVACY', cohortSize: cohort.length, minimumCohort, metrics: null };
  const keys = ['revenuePerMile','deadheadPercent','offerAcceptanceRate','averageMargin','onTimePickup','onTimeDelivery','cancellationRate','averageSettlementHours','averageLoadValue']; const metrics = {};
  for (const key of keys) { const values = cohort.map((row) => number(row[key], NaN)).filter(Number.isFinite); if (values.length < minimumCohort) { metrics[key] = { status: 'SUPPRESSED' }; continue; } const networkMedian = percentile(values,.5); metrics[key] = { subject: number(subject[key], null), networkMedian: round(networkMedian,2), percentile: subject[key] == null ? null : Math.round(values.filter((value) => value <= number(subject[key])).length / values.length * 100) }; }
  return { status: 'AVAILABLE', cohortSize: cohort.length, minimumCohort, anonymized: true, dataLabel: DATA_SOURCES.network, metrics };
}
