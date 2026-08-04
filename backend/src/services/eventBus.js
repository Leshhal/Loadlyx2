import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { enqueueJob } from './durableQueue.js';

export const PLATFORM_EVENTS = Object.freeze(['user.created','user.verified','tenant.created','tenant.activated','lead.created','quote.submitted','quote.parsed','quote.priced','quote.sent','quote.viewed','quote.accepted','quote.declined','quote.expired','deposit.requested','deposit.paid','deposit.failed','load.created','load.ready_for_dispatch','carrier.recommended','carrier.offered','carrier.accepted','carrier.declined','load.assigned','load.started','load.completed','order.created','order.paid','order.fulfilled','review.requested','review.submitted','payout.created','payout.released','refund.created','subscription.created','subscription.renewed','subscription.past_due','subscription.cancelled']);

export async function publishEvent({ tenantId = null, eventType, aggregateType, aggregateId, payload = {}, metadata = {}, idempotencyKey, correlationId = null, causationId = null }) {
  if (!PLATFORM_EVENTS.includes(eventType)) throw new Error(`Unsupported event type: ${eventType}`);
  const key = idempotencyKey || crypto.createHash('sha256').update(JSON.stringify({ tenantId, eventType, aggregateType, aggregateId, payload })).digest('hex');
  const event = await prisma.platformEvent.upsert({ where: { idempotencyKey: key }, update: {}, create: { tenantId, eventType, aggregateType, aggregateId, payloadJson: payload, metadataJson: metadata, idempotencyKey: key, correlationId, causationId } });
  const workflows = await prisma.workflowDefinition.findMany({ where: { enabled: true, triggerType: eventType, OR: [{ tenantId }, { tenantId: null }] } });
  for (const workflow of workflows) {
    const run = await prisma.workflowRun.upsert({ where: { workflowId_eventId: { workflowId: workflow.id, eventId: event.id } }, update: {}, create: { tenantId, workflowId: workflow.id, eventId: event.id, contextJson: { event: payload, metadata } } });
    await enqueueJob({ tenantId, workflowRunId: run.id, jobType: 'WORKFLOW_RUN', queueName: 'workflows', payload: { workflowRunId: run.id }, idempotencyKey: `workflow:${run.id}` });
  }
  return event;
}
