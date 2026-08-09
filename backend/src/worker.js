import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();
import { prisma } from './db/prisma.js';
import { claimJob, completeJob, failJob } from './services/durableQueue.js';
import { deliverNotification } from './services/notificationService.js';
import { runWorkflow } from './services/workflowRunner.js';
import { runScheduledSimulation } from './services/simulationService.js';

const workerId = `${process.pid}:${crypto.randomUUID()}`;
const queues = (process.env.WORKER_QUEUES || 'workflows,notifications,default').split(',').map((value) => value.trim()).filter(Boolean);
const pollMs = Math.max(250, Number(process.env.WORKER_POLL_MS || 1000));
let stopping = false;
let lastSimulationSweep = 0;

async function execute(job) {
  if (job.jobType === 'WORKFLOW_RUN') return runWorkflow(job.payloadJson.workflowRunId);
  if (job.jobType === 'SEND_NOTIFICATION') {
    const notification = await prisma.notification.findUnique({ where: { idempotencyKey: job.payloadJson.idempotencyKey } });
    if (!notification || ['SENT','DELIVERED','CANCELED'].includes(notification.status)) return { skipped: true };
    try {
      const result = await deliverNotification(notification);
      await prisma.notification.update({ where: { id: notification.id }, data: { status: result.delivered ? 'DELIVERED' : 'SENT', providerId: result.providerId, sentAt: new Date() } });
      return result;
    } catch (error) {
      await prisma.notification.update({ where: { id: notification.id }, data: { status: 'FAILED', failureCode: String(error.message).slice(0, 200) } });
      throw error;
    }
  }
  throw new Error(`No worker handler registered for ${job.jobType}`);
}

async function tick() {
  if (Date.now() - lastSimulationSweep >= 60_000) {
    lastSimulationSweep = Date.now();
    await runScheduledSimulation(prisma);
  }
  for (const queue of queues) {
    const job = await claimJob(workerId, queue);
    if (!job) continue;
    try { await completeJob(job.id, await execute(job)); }
    catch (error) { await failJob(job, error); console.error(JSON.stringify({ level: 'error', event: 'job.failed', jobId: job.id, jobType: job.jobType, message: error.message })); }
  }
}

async function loop() {
  console.log(JSON.stringify({ level: 'info', event: 'worker.started', workerId, queues }));
  while (!stopping) { try { await tick(); } catch (error) { console.error(JSON.stringify({ level: 'error', event: 'worker.tick_failed', message: error.message })); } await new Promise((resolve) => setTimeout(resolve, pollMs)); }
  await prisma.$disconnect();
}
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { stopping = true; });
loop();
