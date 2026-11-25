export function legacyCheckoutHandler({ db, handleCheckout }) {
  return async (req, res, next) => {
    try {
      if (!req.tenant?.id) return res.status(404).json({ error: 'Tenant storefront not found' });
      const input = req.body || {};
      const quantity = Number(input.quantity ?? 1);
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
        return res.status(400).json({ error: 'Quantity must be between 1 and 100' });
      }
      const product = await db.product.findFirst({
        where: { tenantId: req.tenant.id, slug: String(input.productSlug || ''), isActive: true, publicationStatus: 'ACTIVE' },
        select: { id: true }
      });
      if (!product) return res.status(404).json({ error: 'Product not found' });
      req.body = {
        customerEmail: input.email, customerName: input.name,
        shippingCountry: input.country || 'CA', shippingProvince: input.province,
        shippingAddressLine1: input.address, shippingCity: input.city,
        shippingPostalCode: input.postalCode,
        items: [{ productId: product.id, quantity }], paymentMethod: 'STRIPE'
      };
      const sendJson = res.json.bind(res);
      res.json = (body) => sendJson(body?.checkoutUrl ? { ...body, url: body.checkoutUrl } : body);
      req.url = '/checkout';
      return handleCheckout(req, res, next);
    } catch (error) { return next(error); }
  };
}

export function checkoutConfirmationHandler({ db, stripeClient }) {
  return async (req, res, next) => {
    try {
      if (!req.tenant?.id) return res.status(404).json({ error: 'Tenant storefront not found' });
      // Find the tenant's order before reading provider customer information.
      const order = await db.order.findFirst({
        where: { stripeCheckoutSessionId: req.params.sessionId, tenantId: req.tenant.id },
        include: { items: true, tenant: { select: { slug: true, name: true } } }
      });
      if (!order) return res.status(404).json({ error: 'Checkout session not found' });
      if (!stripeClient) return res.status(503).json({ error: 'Stripe is not configured.' });
      const session = await stripeClient.checkout.sessions.retrieve(req.params.sessionId, { expand: ['line_items', 'customer_details'] });
      if (session.metadata?.orderId !== order.id || session.metadata?.tenantId !== order.tenantId) {
        return res.status(409).json({ error: 'Checkout session does not match this order' });
      }
      return res.json({ session: {
        id: session.id, paymentStatus: session.payment_status,
        customerEmail: session.customer_email, customerName: session.customer_details?.name,
        amountTotal: session.amount_total, currency: session.currency
      }, order });
    } catch (error) { return next(error); }
  };
}

export function validateStripeStoreSession(order, session) {
  if (!order || !session || order.tenant?.isDemo || order.tenant?.isActive === false) return false;
  if (session.mode !== 'payment' || session.payment_status !== 'paid') return false;
  if (session.metadata?.orderId !== order.id || session.metadata?.tenantId !== order.tenantId) return false;
  if (!order.stripeCheckoutSessionId || session.id !== order.stripeCheckoutSessionId) return false;
  if (!Number.isSafeInteger(session.amount_total) || session.amount_total !== order.totalCents) return false;
  if (String(session.currency || '').toLowerCase() !== String(order.currency).toLowerCase()) return false;
  const rate = session.metadata?.commissionBps;
  if (rate !== undefined && (!/^\d+$/.test(String(rate)) || Number(rate) > 10000)) return false;
  return true;
}
