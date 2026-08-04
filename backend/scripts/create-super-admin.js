import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = String(process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.SUPER_ADMIN_PASSWORD || '');

  if (!email || !email.includes('@')) throw new Error('SUPER_ADMIN_EMAIL must be a valid email address');
  if (password.length < 8) throw new Error('SUPER_ADMIN_PASSWORD must contain at least 8 characters');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      fullName: 'Loadlyx Super Administrator',
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
      emailVerifiedAt: new Date()
    },
    create: {
      fullName: 'Loadlyx Super Administrator',
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
      emailVerifiedAt: new Date()
    },
    select: { id: true, email: true, role: true, isActive: true, emailVerifiedAt: true }
  });

  console.log(JSON.stringify({ created: true, user }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
