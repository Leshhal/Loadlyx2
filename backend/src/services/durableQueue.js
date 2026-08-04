import crypto from 'crypto';
import { prisma } from '../db/prisma.js';

export function retryDelayMs(attempt, baseMs = 5000, maxMs = 60 * 60 * 1000) {
  return Math.min(maxMs, baseMs * (2 ** Math.max(0, attempt - 1)));
}

export async function enqueueJob({ tenantId = null, workflowRunId = null, jobType, queueName = 'default', payload, idempotencyKey, availableAt = new Date(), maxAttempts = 5 }) {
  const key = idempotencyKey || crypto.createHash('sha256').update(JSON.stringify({ tenantId, workflowRunId, jobType, payload })).digest('hex');
  return prisma.backgroundJob.upsert({ where: { idempotencyKey: key }, update: {}, create: { tenantId, workflowRunId, jobType, queueName, payloadJson: payload, idempotencyKey: key, availableAt, maxAttempts } });
}

export async function claimJob(workerId, queueName = 'default') {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT id FROM "BackgroundJob"
      WHERE "queueName" = ${queueName}
        AND status IN ('QUEUED', 'RETRY_SCHEDULED')
        AND "availableAt" <= NOW()
      ORDER BY "availableAt" ASC, "createdAt" ASC
      FOR UPDATE SKIP LOCKED LIMIT 1`;
    if (!rows.length) return null;
    return tx.backgroundJob.update({ where: { id: rows[0].id }, data: { status: 'RUNNING', lockedAt: new Date(), lockedBy: workerId, attempts: { increment: 1 } } });
  });
}

export async function completeJob(id, result = {}) {
  return prisma.backgroundJob.update({ where: { id }, data: { status: 'SUCCEEDED', resultJson: result, completedAt: new Date(), lockedAt: null, lockedBy: null } });
}

export async function failJob(job, error) {
  const terminal = job.attempts >= job.maxAttempts;
  return prisma.backgroundJob.update({ where: { id: job.id }, data: { status: terminal ? 'DEAD_LETTERED' : 'RETRY_SCHEDULED', lastError: String(error?.message || error).slice(0, 4000), availableAt: terminal ? job.availableAt : new Date(Date.now() + retryDelayMs(job.attempts)), lockedAt: null, lockedBy: null } });
}
