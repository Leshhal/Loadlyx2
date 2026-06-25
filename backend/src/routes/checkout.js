import express from 'express';
import Stripe from 'stripe';
import { prisma } from '../db/prisma.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post('/create-session', async (req, res) => {
try {
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

const subtotal = unitAmount * qty;
const fee = Math.round(subtotal * 0.08);
const net = subtotal - fee;

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

await prisma.tenantLedger.create({
data: {
tenantId: tenant.id,
orderId: order.id,
grossCents: subtotal,
feeCents: fee,
netCents: net,
status: 'pending'
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
success_url: 'http://localhost:3000/success',
cancel_url: 'http://localhost:3000/cancel'
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
