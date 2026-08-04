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
