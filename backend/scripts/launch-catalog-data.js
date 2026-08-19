import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const cansaskNames = [
  'Small Moving Box','Medium Moving Box','Large Moving Box','Extra-Large Moving Box','Wardrobe Box','Dish Pack Box','File Box','Mirror and Picture Box','TV Moving Box','Lamp Box',
  'Studio Apartment Moving Kit','One-Bedroom Moving Kit','Two-Bedroom Moving Kit','Three-Bedroom Moving Kit','Four-Bedroom Moving Kit','Small Office Moving Kit','Kitchen Packing Kit','Fragile Item Packing Kit',
  'Light-Duty Ratchet Straps','Heavy-Duty Ratchet Straps','Bungee Cord Set','Cargo Tie-Down Set','Moving Rope','Stretch Wrap','Furniture Moving Blankets','Corner Protectors','Cargo Net','Tie-Down Anchor Set',
  'Packing Tape','Tape Gun','Tape Gun with Tape Bundle','Moving Labels','Fragile Labels','Permanent Markers','Packing Paper','Bubble Wrap','Foam Wrap','Shrink Wrap','Furniture Wrap','Box Cutter','Scissors','Packing Peanuts','Zip Ties',
  'Small Mattress Cover','Double Mattress Cover','Queen Mattress Cover','King Mattress Cover','Sofa Cover','Chair Cover','Appliance Cover','Dust Cover','Floor Protection Film','Carpet Protector','Door Jamb Protector','Moving Dolly','Furniture Dolly','Hand Truck','Forearm Lifting Straps','Furniture Sliders','Piano Moving Straps',
  'Plastic Tote','Tote Lid','Tote Dolly','Tote Label Pack','Reusable Packing Crate','Hanging File Crate','Glass Divider Kit','Dish Cell Kit','Picture Corner Kit','Moving Day Essentials Bundle'
];
const demoNames = ['Small Moving Box','Medium Moving Box','Packing Tape','Moving Blanket','20-Tote Rental Package'];
const safeUserEmails = ['admin@loadlyx.com','demo@loadlyx.com','saskmoves@gmail.com','broker@loadlyx.com','carrier@loadlyx.com','customer@loadlyx.com'];
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function audit() {
  const [users, tenants] = await Promise.all([
    prisma.user.findMany({ where: { email: { in: safeUserEmails } }, select: { id: true, email: true, role: true, tenantId: true, isActive: true, emailVerifiedAt: true } }),
    prisma.tenant.findMany({ where: { slug: { in: ['cansask','demo'] } }, select: { id: true, slug: true, name: true, isDemo: true, _count: { select: { users: true, products: true, orders: true, loads: true } } } })
  ]);
  if (users.length !== safeUserEmails.length || tenants.length !== 2) throw new Error('Safety gate failed: designated identities or launch tenants are missing.');
  const bySlug = Object.fromEntries(tenants.map(t => [t.slug, t]));
  const current = await prisma.product.findMany({ where: { tenantId: { in: tenants.map(t => t.id) } }, select: { tenantId: true, slug: true } });
  const count = (tenant, names) => names.reduce((a,n)=>{current.some(p=>p.tenantId===tenant.id&&p.slug===slugify(n))?a.unchanged++:a.create++;return a;},{create:0,update:0,unchanged:0});
  return { dryRun: !apply, destructiveChanges: 0, users: users.map(u=>({id:u.id,email:u.email,role:u.role,tenantId:u.tenantId,isActive:u.isActive,verified:Boolean(u.emailVerifiedAt)})), tenants: tenants.map(t=>({id:t.id,slug:t.slug,counts:t._count})), products: { cansask: count(bySlug.cansask,cansaskNames), demo: count(bySlug.demo,demoNames) } };
}

async function main(){const report=await audit();console.log(JSON.stringify(report,null,2));if(!apply)return;throw new Error('Production launch catalog is applied by the reviewed additive migration during deployment; --apply is intentionally disabled to prevent an unreviewed direct mutation.');}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>prisma.$disconnect());
