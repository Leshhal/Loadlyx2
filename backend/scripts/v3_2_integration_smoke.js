import assert from 'node:assert/strict';
import crypto from 'crypto';
import { prisma } from '../src/db/prisma.js';
import { claimJob, completeJob, enqueueJob } from '../src/services/durableQueue.js';
import { publishEvent } from '../src/services/eventBus.js';

const suffix = crypto.randomBytes(4).toString('hex');
try {
  assert.equal(await prisma.aiAgentDefinition.count(), 7, 'agent registry seed');
  assert.equal(await prisma.workflowDefinition.count(), 5, 'workflow template seed');
  const tenant = await prisma.tenant.create({ data: { name: `Smoke ${suffix}`, slug: `smoke-${suffix}`, subdomain: `smoke-${suffix}` } });
  const user = await prisma.user.create({ data: { tenantId: tenant.id, email: `smoke-${suffix}@example.test`, role: 'TENANT_ADMIN', isActive: true, emailVerifiedAt: new Date() } });
  const workflow = await prisma.workflowDefinition.create({ data: { tenantId: tenant.id, scopeKey: `TENANT:${tenant.id}`, key: `smoke.${suffix}`, name: 'Smoke workflow', triggerType: 'lead.created', version: 1, enabled: true, definition: { steps: [{ type: 'ACTION', action: 'CREATE_NOTIFICATION', config: { channel: 'IN_APP', recipient: user.email } }] } } });
  const eventInput = { tenantId: tenant.id, eventType: 'lead.created', aggregateType: 'LEAD', aggregateId: `lead-${suffix}`, payload: { value: 1 }, metadata: { actorUserId: user.id, userId: user.id, recipient: user.email }, idempotencyKey: `smoke-event-${suffix}` };
  const eventA = await publishEvent(eventInput);
  const eventB = await publishEvent(eventInput);
  assert.equal(eventA.id, eventB.id, 'duplicate events are idempotent');
  assert.equal(await prisma.workflowRun.count({ where: { workflowId: workflow.id } }), 1, 'event creates one workflow run');
  const direct = await enqueueJob({ tenantId: tenant.id, jobType: 'SMOKE', payload: { ok: true }, idempotencyKey: `smoke-job-${suffix}` });
  const duplicate = await enqueueJob({ tenantId: tenant.id, jobType: 'SMOKE', payload: { ok: true }, idempotencyKey: `smoke-job-${suffix}` });
  assert.equal(direct.id, duplicate.id, 'duplicate jobs are idempotent');
  const claimed = await claimJob(`smoke-worker-${suffix}`, 'default');
  assert.equal(claimed.id, direct.id, 'worker claims queued job');
  await completeJob(claimed.id, { ok: true });
  assert.equal((await prisma.backgroundJob.findUnique({ where: { id: direct.id } })).status, 'SUCCEEDED');
  console.log(JSON.stringify({ ok: true, agents: 7, workflowTemplates: 5, eventId: eventA.id, tenantIsolationScope: tenant.id, idempotentJobId: direct.id }));
} finally {
  await prisma.$disconnect();
}
