import express from 'express';
import Stripe from 'stripe';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';

const router = express.Router();
const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;

router.post('/create-session', async (req, res) => {
try {
if (!stripe) return res.status(503).json({ error: 'Card checkout is not configured' });
const tenantSlug = req.headers['x-tenant-slug'];
const { productSlug, quantity, name, email, country, province, address, city, postalCode } = req.body;

const tenant = await prisma.tenant.findUnique({
where: { slug: tenantSlug }
});

if (!tenant) {
return res.status(404).json({ error: 'Tenant not found' });
}

const product = await prisma.product.findFirst({
where: {
slug: productSlug,
tenantId: tenant.id
}
});

if (!product) {
return res.status(404).json({ error: 'Product not found' });
}

const unitAmount = Number(product.priceCents);
const qty = Number(quantity || 1);

if (!unitAmount || unitAmount <= 0) {
return res.status(400).json({ error: 'Invalid product price' });
}
if (!Number.isSafeInteger(qty) || qty < 1 || qty > 100) return res.status(400).json({ error: 'Quantity must be between 1 and 100' });
if (!String(email || '').includes('@')) return res.status(400).json({ error: 'Valid customer email is required' });

const subtotal = unitAmount * qty;

const customer = await prisma.customer.upsert({
where: {
tenantId_email: {
tenantId: tenant.id,
email
}
},
update: {
name,
address: {address, city, province, postalCode, country}
},
create: {
tenantId: tenant.id,
name,
email,
address: {address, city, province, postalCode, country}
}
});

const order = await prisma.order.create({
data: {
tenantId: tenant.id,
customerEmail: email,
customerName: name,

shippingAddressJson: {
address,
city,
province,
postalCode,
country
},

status: 'PENDING',
paymentStatus: 'PENDING',
currency: 'cad',
subtotalCents: subtotal,
shippingCents: 0,
totalCents: subtotal,
shippingCountry: country || 'CA',
shippingProvince: province || null
}
});

const session = await stripe.checkout.sessions.create({
payment_method_types: ['card'],
mode: 'payment',
customer_email: email,
line_items: [
{
price_data: {
currency: 'cad',
product_data: {
name: product.name
},
unit_amount: unitAmount
},
quantity: qty
}
],
metadata: {
orderId: order.id,
tenantId: tenant.id,
customerId: customer.id
},
success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/success`,
cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/cancel`
});

await prisma.order.update({
where: { id: order.id },
data: {
stripeCheckoutSessionId: session.id
}
});

return res.json({ url: session.url });
} catch (err) {
console.error('CHECKOUT ERROR:', err);
return res.status(500).json({ error: err.message || 'checkout failed' });
}
});

export default router;
