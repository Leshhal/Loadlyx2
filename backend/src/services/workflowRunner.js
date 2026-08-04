import { prisma } from '../db/prisma.js';
import { enqueueJob } from './durableQueue.js';

function conditionMatches(condition, context) {
  if (!condition?.path) return false;
  const value = condition.path.split('.').reduce((current, key) => current?.[key], context);
  if ('equals' in condition) return value === condition.equals;
  if ('in' in condition) return Array.isArray(condition.in) && condition.in.includes(value);
  if ('exists' in condition) return condition.exists ? value !== undefined && value !== null : value === undefined || value === null;
  return false;
}

export async function runWorkflow(workflowRunId) {
  const run = await prisma.workflowRun.findUnique({ where: { id: workflowRunId }, include: { workflow: true, event: true } });
  if (!run || ['SUCCEEDED','CANCELED','DEAD_LETTERED'].includes(run.status)) return { skipped: true };
  const definition = run.workflow.definition;
  const steps = Array.isArray(definition?.steps) ? definition.steps : [];
  let context = run.contextJson || {};
  await prisma.workflowRun.update({ where: { id: run.id }, data: { status: 'RUNNING', startedAt: run.startedAt || new Date() } });
  for (let index = run.currentStep; index < steps.length; index += 1) {
    const step = steps[index];
    if (step.type === 'CONDITION' && !conditionMatches(step.config, context)) {
      context = { ...context, conditionStoppedAt: index };
      break;
    }
    if (step.type === 'DELAY') {
      const delayMs = Math.max(1000, Math.min(Number(step.config?.milliseconds || 0), 30 * 24 * 60 * 60 * 1000));
      await prisma.workflowRun.update({ where: { id: run.id }, data: { status: 'PENDING', currentStep: index + 1, contextJson: context } });
      await enqueueJob({ tenantId: run.tenantId, workflowRunId: run.id, jobType: 'WORKFLOW_RUN', queueName: 'workflows', payload: { workflowRunId: run.id }, idempotencyKey: `workflow:${run.id}:step:${index + 1}`, availableAt: new Date(Date.now() + delayMs) });
      return { delayed: true, nextStep: index + 1 };
    }
    if (step.type === 'APPROVAL') {
      const actorUserId = run.event.metadataJson?.actorUserId;
      if (!actorUserId) throw new Error('Approval workflow step requires metadata.actorUserId');
      await prisma.approvalRequest.create({ data: { tenantId: run.tenantId, requestedById: actorUserId, actionType: step.action || 'WORKFLOW_ACTION', targetType: run.event.aggregateType, targetId: run.event.aggregateId, riskLevel: step.config?.riskLevel || 'MEDIUM', requestedJson: { workflowRunId: run.id, step: index, context } } });
      await prisma.workflowRun.update({ where: { id: run.id }, data: { status: 'WAITING_APPROVAL', currentStep: index, contextJson: context } });
      return { waitingApproval: true, step: index };
    }
    if (step.type === 'ACTION') {
      if (step.action === 'CREATE_NOTIFICATION') {
        const recipient = step.config?.recipient || run.event.metadataJson?.recipient;
        if (!recipient) throw new Error('Notification action requires a recipient');
        await prisma.notification.upsert({ where: { idempotencyKey: `workflow:${run.id}:notification:${index}` }, update: {}, create: { tenantId: run.tenantId, userId: run.event.metadataJson?.userId || null, channel: step.config?.channel || 'IN_APP', templateKey: step.config?.templateKey || run.event.eventType, recipient, subject: step.config?.subject, payloadJson: { event: run.event.payloadJson, workflowRunId: run.id }, idempotencyKey: `workflow:${run.id}:notification:${index}` } });
        await enqueueJob({ tenantId: run.tenantId, workflowRunId: run.id, jobType: 'SEND_NOTIFICATION', queueName: 'notifications', payload: { idempotencyKey: `workflow:${run.id}:notification:${index}` }, idempotencyKey: `send:workflow:${run.id}:notification:${index}` });
      } else if (step.action === 'ENQUEUE_JOB') {
        await enqueueJob({ tenantId: run.tenantId, workflowRunId: run.id, jobType: step.config?.jobType || 'GENERIC_ACTION', queueName: step.config?.queueName || 'default', payload: { ...step.config?.payload, event: run.event.payloadJson }, idempotencyKey: `workflow:${run.id}:job:${index}` });
      } else {
        throw new Error(`Unsupported workflow action: ${step.action}`);
      }
    }
    await prisma.workflowRun.update({ where: { id: run.id }, data: { currentStep: index + 1, contextJson: context } });
  }
  await prisma.workflowRun.update({ where: { id: run.id }, data: { status: 'SUCCEEDED', currentStep: steps.length, contextJson: context, resultJson: { completedSteps: steps.length }, completedAt: new Date() } });
  return { succeeded: true, completedSteps: steps.length };
}
