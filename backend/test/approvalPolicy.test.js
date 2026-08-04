import test from 'node:test';
import assert from 'node:assert/strict';
import { assertApprovalTransition, evaluateApprovalPolicy } from '../src/services/approvalPolicy.js';

test('money and low-confidence recommendations require explicit review', () => {
  const result = evaluateApprovalPolicy({ actionType: 'REFUND', confidenceScore: 0.71, riskLevel: 'HIGH', policy: { minConfidence: 0.85, allowAutomaticMoneyActions: true } });
  assert.equal(result.manualReviewRequired, true);
  assert.equal(result.autoAllowed, false);
  assert.ok(result.manualReviewReasons.some((reason) => reason.includes('always requires')));
  assert.ok(result.manualReviewReasons.some((reason) => reason.includes('below')));
});

test('safe operational action may auto-run only under explicit policy', () => {
  const result = evaluateApprovalPolicy({ actionType: 'DISPATCH_ASSIGN', confidenceScore: 0.94, riskLevel: 'LOW', policy: { minConfidence: 0.9, allowAutomaticOperationalActions: true, allowAutoAssign: true }, facts: { compliancePassed: true, hasSchedulingConflict: false } });
  assert.equal(result.autoAllowed, true);
});

test('approval decisions are terminal', () => {
  assert.doesNotThrow(() => assertApprovalTransition('PENDING', 'APPROVED'));
  assert.throws(() => assertApprovalTransition('APPROVED', 'REJECTED'));
});
