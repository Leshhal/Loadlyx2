import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { SUBSCRIPTION_PLANS } from '../src/config/plans.js';

const prisma = new PrismaClient();

const password = String(process.env.LOCAL_TENANT_PASSWORD || '');
if (password.length < 8) throw new Error('LOCAL_TENANT_PASSWORD must contain at least 8 characters');

async function ensureTenantDefaults(tenant) {
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
    }),
    prisma.aiTenantConfig.upsert({
      where: { tenantId: tenant.id },
      update: {},
      create: { tenantId: tenant.id, enabled: false, monthlyRequestLimit: 100, allowedModules: [] }
    }),
    prisma.simulationConfig.upsert({
      where: { scopeKey: `TENANT:${tenant.id}` },
      update: {},
      create: { scopeKey: `TENANT:${tenant.id}`, tenantId: tenant.id, enabled: false, businessHours: {} }
    })
  ]);
}

async function ensureTenant({ name, slug, email, brandingJson }) {
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
      brandingJson
    }
  });
  await ensureTenantDefaults(tenant);
  return tenant;
}

async function ensureOwner({ tenant, email, fullName, replaceExistingOwner = false }) {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  const emailUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (emailUser && emailUser.tenantId && emailUser.tenantId !== tenant.id) {
    throw new Error(`${normalizedEmail} already belongs to another tenant`);
  }

  let owner = emailUser;
  if (!owner && replaceExistingOwner) {
    owner = await prisma.user.findFirst({
      where: { tenantId: tenant.id, role: 'TENANT_ADMIN' },
      orderBy: { createdAt: 'asc' }
    });
  }

  if (owner) {
    return prisma.user.update({
      where: { id: owner.id },
      data: {
        tenantId: tenant.id,
        email: normalizedEmail,
        fullName,
        passwordHash,
        role: 'TENANT_ADMIN',
        isActive: true,
        emailVerifiedAt: new Date()
      }
    });
  }

  return prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: normalizedEmail,
      fullName,
      passwordHash,
      role: 'TENANT_ADMIN',
      isActive: true,
      emailVerifiedAt: new Date()
    }
  });
}

async function main() {
  const canSask = await ensureTenant({
    name: 'CanSask Van Lines',
    slug: 'cansask',
    email: 'saskmoves@gmail.com',
    brandingJson: {
      heroTitle: 'CanSask Van Lines',
      heroSubtitle: 'Moving, supplies, brokerage, and shipping powered by Loadlyx.',
      primaryColor: '#111827',
      accentColor: '#2563eb',
      theme: 'default',
      tenantPages: []
    }
  });
  const canSaskOwner = await ensureOwner({
    tenant: canSask,
    email: 'saskmoves@gmail.com',
    fullName: 'CanSask Administrator'
  });

  const demo = await ensureTenant({
    name: 'Loadlyx Demo',
    slug: 'demo',
    email: 'demo@loadlyx.com',
    brandingJson: {
      heroTitle: 'Loadlyx Demo Storefront',
      heroSubtitle: 'Demo moving, logistics, and supply storefront powered by Loadlyx.',
      primaryColor: '#2563eb',
      accentColor: '#1d4ed8',
      theme: 'default',
      tenantPages: []
    }
  });
  const demoOwner = await ensureOwner({
    tenant: demo,
    email: 'demo@loadlyx.com',
    fullName: 'Loadlyx Demo Administrator',
    replaceExistingOwner: true
  });

  const configuredTenants = await prisma.tenant.findMany({
    where: { id: { in: [canSask.id, demo.id] } },
    select: {
      id: true,
      name: true,
      slug: true,
      commissionPolicy: { select: { storeCommissionBps: true, marketplaceCommissionBps: true } },
      subscription: { select: { planCode: true, status: true } },
      simulationConfig: { select: { enabled: true } },
      aiConfig: { select: { enabled: true } }
    },
    orderBy: { slug: 'asc' }
  });

  console.log(JSON.stringify({
    tenants: [
      { name: canSask.name, slug: canSask.slug, email: canSaskOwner.email, role: canSaskOwner.role },
      { name: demo.name, slug: demo.slug, email: demoOwner.email, role: demoOwner.role }
    ],
    defaults: configuredTenants
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
