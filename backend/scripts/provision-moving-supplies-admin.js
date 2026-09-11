import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const email = 'supplies@loadlyx.com';
const password = String(process.env.PRODUCTION_TEST_PASSWORD || '');

if (password.length < 8) throw new Error('PRODUCTION_TEST_PASSWORD must contain at least 8 characters');

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'movingsupplies' }, select: { id: true, isActive: true } });
  if (!tenant?.isActive) throw new Error('Active Moving Supplies tenant not found');
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { tenantId: tenant.id, fullName: 'Moving Supplies Administrator', role: 'TENANT_ADMIN', passwordHash, isActive: true, isTestAccount: false, emailVerifiedAt: new Date() },
    create: { tenantId: tenant.id, fullName: 'Moving Supplies Administrator', email, role: 'TENANT_ADMIN', passwordHash, isActive: true, isTestAccount: false, emailVerifiedAt: new Date() },
    select: { id: true, email: true, role: true, tenantId: true, isActive: true, emailVerifiedAt: true }
  });
  console.log(JSON.stringify({ provisioned: { ...user, emailVerified: Boolean(user.emailVerifiedAt), emailVerifiedAt: undefined } }, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => prisma.$disconnect());