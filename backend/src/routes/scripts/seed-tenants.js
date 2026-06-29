import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
await prisma.tenant.upsert({
where: { slug: 'demo' },
update: {
name: 'Loadlyx Demo',
isActive: true
},
create: {
name: 'Loadlyx Demo',
slug: 'demo',
subdomain: 'demo',
isActive: true,
brandingJson: {
heroTitle: 'Loadlyx Demo Storefront',
heroSubtitle: 'Demo moving, logistics, and supply storefront powered by Loadlyx.',
primaryColor: '#2563eb',
accentColor: '#1d4ed8'
}
}
});

await prisma.tenant.upsert({
where: { slug: 'cansask' },
update: {
name: 'CanSask Van Lines',
isActive: true
},
create: {
name: 'CanSask Van Lines',
slug: 'cansask',
subdomain: 'cansask',
isActive: true,
brandingJson: {
heroTitle: 'CanSask Van Lines',
heroSubtitle: 'Moving, supplies, brokerage, and shipping powered by Loadlyx.',
primaryColor: '#111827',
accentColor: '#2563eb'
}
}
});

console.log('Seeded demo and cansask tenants');
}

main()
.catch((error) => {
console.error(error);
process.exit(1);
})
.finally(async () => {
await prisma.$disconnect();
});
