import crypto from 'crypto';

const COUNTS = { LOW: 8, MEDIUM: 24, HIGH: 60 };
const KINDS = ['LOAD_POSTED', 'CARRIER_BID', 'STORE_ORDER', 'CUSTOMER_MESSAGE', 'REVIEW_CREATED', 'CRM_LEAD', 'DISPATCH_UPDATE', 'NOTIFICATION'];
const CITIES = ['Winnipeg', 'Toronto', 'Calgary', 'Vancouver', 'Regina', 'Minneapolis', 'Chicago'];

export function buildSimulationEvents({ intensity = 'LOW', tenantId = null, region = 'North America', runId = crypto.randomUUID(), now = new Date() }) {
  const count = COUNTS[intensity];
  if (!count) throw new Error('Invalid simulation intensity');
  return Array.from({ length: count }, (_, index) => {
    const kind = KINDS[index % KINDS.length];
    const origin = CITIES[index % CITIES.length];
    const destination = CITIES[(index + 2) % CITIES.length];
    return {
      tenantId,
      runId,
      kind,
      isSimulated: true,
      createdAt: new Date(now.getTime() + index * 1000),
      payloadJson: {
        simulation: true,
        watermark: 'DEMO DATA',
        sequence: index + 1,
        region,
        origin,
        destination,
        amountCents: kind === 'STORE_ORDER' ? 2500 + index * 100 : null,
        financialEffect: 'NONE',
        notificationsSent: false
      }
    };
  });
}

export function summarizeSimulation(events = []) {
  return events.reduce((summary, event) => {
    summary.total += 1;
    summary.byKind[event.kind] = (summary.byKind[event.kind] || 0) + 1;
    return summary;
  }, { total: 0, byKind: {} });
}

export function buildScheduledLoadEvent({ tenantId = null, region = 'North America', now = new Date() }) {
  const [event] = buildSimulationEvents({ intensity: 'LOW', tenantId, region, now });
  return { ...event, kind: 'LOAD_POSTED', payloadJson: { ...event.payloadJson, cadence: 'THREE_HOURS', targetActiveLoads: 11 } };
}

export async function runScheduledSimulation(db, { now = new Date(), intervalHours = 3, targetActiveLoads = 11 } = {}) {
  const cutoff = new Date(now.getTime() - intervalHours * 60 * 60 * 1000);
  const flag = await db.featureFlag.findUnique({ where: { key: 'demo-simulation' } });
  if (!flag?.enabled) return [];
  const allowedTenants = Array.isArray(flag.tenantIds) ? flag.tenantIds : [];
  const configs = await db.simulationConfig.findMany({ where: { enabled: true } });
  const results = [];
  for (const config of configs) {
    if (allowedTenants.length && (!config.tenantId || !allowedTenants.includes(config.tenantId))) continue;
    const scope = config.tenantId ? { tenantId: config.tenantId } : { tenantId: null };
    const [activeCount, recent] = await Promise.all([
      db.simulationEvent.count({ where: { ...scope, kind: 'LOAD_POSTED' } }),
      db.simulationEvent.findFirst({ where: { ...scope, kind: 'LOAD_POSTED', createdAt: { gte: cutoff } }, select: { id: true } })
    ]);
    if (activeCount >= targetActiveLoads || recent) {
      results.push({ scopeKey: config.scopeKey, created: false, reason: activeCount >= targetActiveLoads ? 'TARGET_REACHED' : 'CADENCE_WAIT' });
      continue;
    }
    const event = buildScheduledLoadEvent({ tenantId: config.tenantId, region: config.region || 'North America', now });
    const created = await db.simulationEvent.create({ data: event, select: { id: true } });
    results.push({ scopeKey: config.scopeKey, created: true, eventId: created.id });
  }
  return results;
}
