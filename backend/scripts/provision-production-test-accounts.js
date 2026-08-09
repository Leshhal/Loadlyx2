import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { SUBSCRIPTION_PLANS } from '../src/config/plans.js';

const prisma = new PrismaClient();

const password = String(process.env.PRODUCTION_TEST_PASSWORD || '');
if (password.length < 8) {
  throw new Error('PRODUCTION_TEST_PASSWORD must contain at least 8 characters');
}

const accountDefinitions = [
  { key: 'SUPER_ADMIN_EMAIL', email: 'admin@loadlyx.com', fullName: 'Loadlyx Super Administrator', role: 'SUPER_ADMIN' },
  { key: 'TEST_BROKER_EMAIL', email: 'broker@loadlyx.com', fullName: 'Loadlyx Test Broker', role: 'BROKER' },
  { key: 'TEST_CARRIER_EMAIL', email: 'carrier@loadlyx.com', fullName: 'Loadlyx Test Carrier', role: 'CARRIER' },
  { key: 'TEST_MARKETPLACE_EMAIL', email: 'customer@loadlyx.com', fullName: 'Loadlyx Test Customer', role: 'MARKETPLACE_USER' }
];

function configuredEmail(definition) {
  return String(process.env[definition.key] || definition.email).trim().toLowerCase();
}

async function ensureTenant({ name, slug, email }) {
  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: { name, subdomain: slug, email, isActive: true },
    create: {
      name,
      slug,
      subdomain: slug,
      email,
      isActive: true,
      subscriptionPlan: 'starter',
      brandingJson: {
        heroTitle: name,
        heroSubtitle: 'Moving, logistics, and supplies powered by Loadlyx.',
        primaryColor: '#2563eb',
        accentColor: '#1d4ed8',
        theme: 'default',
        tenantPages: []
      }
    }
  });

  await Promise.all([
    prisma.commissionPolicy.upsert({
      where: { tenantId: tenant.id },
      update: {},
      create: { scopeKey: `TENANT:${tenant.id}`, tenantId: tenant.id }
    }),
    prisma.subscription.upsert({
      where: { tenantId: tenant.id },
      update: {},
      create: {
        tenantId: tenant.id,
        planCode: 'STARTER',
        status: 'TRIALING',
        monthlyPriceCents: SUBSCRIPTION_PLANS.STARTER.monthlyPriceCents,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 86400000)
      }
    })
  ]);

  return tenant;
}

async function upsertUser({ email, fullName, role, tenantId = null }, passwordHash) {
  return prisma.user.upsert({
    where: { email },
    update: {
      fullName,
      role,
      tenantId,
      passwordHash,
      isActive: true,
      isTestAccount: true,
      emailVerifiedAt: new Date()
    },
    create: {
      email,
      fullName,
      role,
      tenantId,
      passwordHash,
      isActive: true,
      isTestAccount: true,
      emailVerifiedAt: new Date()
    },
    select: { id: true, email: true, role: true, tenantId: true, isTestAccount: true }
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  const canSaskEmail = String(process.env.TEST_TENANT_ADMIN_EMAIL || 'saskmoves@gmail.com').trim().toLowerCase();
  const demoEmail = String(process.env.TEST_DEMO_ADMIN_EMAIL || 'demo@loadlyx.com').trim().toLowerCase();

  const [canSask, demo] = await Promise.all([
    ensureTenant({ name: 'CanSask Van Lines', slug: 'cansask', email: canSaskEmail }),
    ensureTenant({ name: 'Loadlyx Demo', slug: 'demo', email: demoEmail })
  ]);

  const users = [];
  for (const definition of accountDefinitions) {
    users.push(await upsertUser({ ...definition, email: configuredEmail(definition) }, passwordHash));
  }
  users.push(await upsertUser({ email: canSaskEmail, fullName: 'CanSask Administrator', role: 'TENANT_ADMIN', tenantId: canSask.id }, passwordHash));
  users.push(await upsertUser({ email: demoEmail, fullName: 'Loadlyx Demo Administrator', role: 'TENANT_ADMIN', tenantId: demo.id }, passwordHash));

  console.log(JSON.stringify({ provisioned: users }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
