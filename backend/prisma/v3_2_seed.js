import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const agents = [
  ['quote-agent','Quote Agent','CUSTOMER','Structure move inventory, rooms, weight, volume, labour, truck type, risk items, confidenceScore and riskLevel.'],
  ['pricing-agent','Pricing Agent','CRM','Recommend a profitable price range and explain deterministic pricing factors without overriding margin rules.'],
  ['dispatch-agent','Dispatch Agent','DISPATCH','Rank compliant carriers, crews, drivers and vehicles, identify conflicts, and return backup choices.'],
  ['sales-follow-up-agent','Sales Follow-up Agent','CRM','Draft policy-compliant quote follow-ups, reminders and review requests. Never send automatically.'],
  ['upsell-agent','Upsell Agent','STORE','Recommend relevant supplies and services and explain each recommendation.'],
  ['support-agent','Support Agent','SUPPORT','Classify support requests, draft replies and escalate disputes, compensation and sensitive complaints.'],
  ['executive-ai','Executive AI','ADMIN','Summarize traceable operating metrics, risks, opportunities and interventions without inventing values.']
];

async function main() {
  for (const [key, name, module, instructions] of agents) {
    await prisma.aiAgentDefinition.upsert({ where: { scopeKey_key_version: { scopeKey: 'GLOBAL', key, version: 1 } }, update: { name, module, instructions }, create: { scopeKey: 'GLOBAL', key, name, module, instructions, enabled: false, allowedRoles: ['SUPER_ADMIN','PLATFORM_ADMIN','ADMIN','SUPPORT','TENANT_ADMIN','TENANT_STAFF','MARKETPLACE_USER','BROKER','CARRIER'], policyJson: { minConfidence: 0.85, allowAutomaticMoneyActions: false, allowAutomaticOperationalActions: false, allowAutoSend: false, allowAutoAssign: false } } });
  }
  const flags = [
    ['ai-operating-system','Centralized AI agents and approval policies'],
    ['workflow-engine','Durable event-driven workflows'],
    ['passkeys','Optional WebAuthn authentication'],
    ['digital-passes','Internal and external wallet passes'],
    ['tote-rentals','Reusable tote lifecycle'],
    ['inventory-intelligence','Multi-location deterministic inventory']
  ];
  for (const [key, description] of flags) await prisma.featureFlag.upsert({ where: { key }, update: { description }, create: { key, description, enabled: false, tenantIds: [] } });
  for (const eventType of ['quote.submitted','quote.accepted','order.paid','load.ready_for_dispatch','load.completed']) {
    const key = `default.${eventType}`;
    await prisma.workflowDefinition.upsert({ where: { scopeKey_key_version: { scopeKey: 'GLOBAL', key, version: 1 } }, update: {}, create: { scopeKey: 'GLOBAL', key, name: `Default ${eventType} workflow`, triggerType: eventType, enabled: false, definition: { steps: [{ type: 'ACTION', action: 'CREATE_NOTIFICATION', config: { channel: 'IN_APP', templateKey: eventType } }] } } });
  }
}

main().finally(() => prisma.$disconnect());
