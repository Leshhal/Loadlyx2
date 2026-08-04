const MONEY_ACTIONS = new Set(['QUOTE_SEND', 'PRICE_OVERRIDE', 'REFUND', 'COMPENSATION', 'PAYOUT', 'DISPUTE_RESOLUTION']);
const OPERATIONAL_ACTIONS = new Set(['DISPATCH_ASSIGN', 'CUSTOMER_MESSAGE', 'CARRIER_OFFER']);
const ALWAYS_MANUAL = new Set(['REFUND', 'COMPENSATION', 'DISPUTE_RESOLUTION', 'DESTRUCTIVE_ACTION']);

export function evaluateApprovalPolicy({ actionType, confidenceScore, riskLevel = 'MEDIUM', policy = {}, facts = {} }) {
  const reasons = [];
  const threshold = Number(policy.minConfidence ?? 0.8);
  const normalizedConfidence = Math.max(0, Math.min(1, Number(confidenceScore || 0)));
  if (ALWAYS_MANUAL.has(actionType)) reasons.push(`${actionType} always requires a human decision`);
  if (normalizedConfidence < threshold) reasons.push(`Confidence ${normalizedConfidence.toFixed(3)} is below ${threshold.toFixed(3)}`);
  if (['HIGH', 'CRITICAL'].includes(riskLevel)) reasons.push(`${riskLevel.toLowerCase()} risk recommendation`);
  if (facts.marginFloorSatisfied === false) reasons.push('Minimum margin is not satisfied');
  if (facts.compliancePassed === false) reasons.push('Compliance requirements did not pass');
  if (facts.hasSchedulingConflict) reasons.push('A scheduling conflict exists');
  if (facts.hasHighRiskItems) reasons.push('High-risk items require review');
  if (facts.suspiciousTransaction) reasons.push('Transaction was flagged as suspicious');
  if (MONEY_ACTIONS.has(actionType) && policy.allowAutomaticMoneyActions !== true) reasons.push('Automatic money actions are disabled');
  if (OPERATIONAL_ACTIONS.has(actionType) && policy.allowAutomaticOperationalActions !== true) reasons.push('Automatic operational actions are disabled');
  if (actionType === 'CUSTOMER_MESSAGE' && policy.allowAutoSend !== true) reasons.push('Automatic customer communication is disabled');
  if (actionType === 'DISPATCH_ASSIGN' && policy.allowAutoAssign !== true) reasons.push('Automatic assignment is disabled');
  return { confidenceScore: normalizedConfidence, riskLevel, manualReviewRequired: reasons.length > 0, manualReviewReasons: reasons, autoAllowed: reasons.length === 0 };
}

export function assertApprovalTransition(from, to) {
  const allowed = { PENDING: ['APPROVED', 'REJECTED', 'CANCELED', 'EXPIRED'] };
  if (!(allowed[from] || []).includes(to)) throw new Error(`Invalid approval transition ${from} -> ${to}`);
}
