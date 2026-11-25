import { getCommercePlan } from '../config/plans.js';
import { recordSubscriptionPayment } from './ledgerService.js';
import { sendTrialEndingEmail } from './emailService.js';

const PURPOSE = 'LOADLYX_SUBSCRIPTION';
export const SUBSCRIPTION_TRIAL_DAYS = 30;
const OPEN_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused']);

function fail(message, statusCode = 409) {
  return Object.assign(new Error(message), { status: statusCode, statusCode });
}

function id(value) {
  return typeof value === 'string' ? value : value?.id;
}

async function lockTenant(tx, tenantId) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`subscription-billing:${tenantId}`}, 0))`;
}

function checkoutReturnUrl(returnUrl, state) {
  const url = new URL(returnUrl);
  url.searchParams.set('billing', state);
  if (state === 'success') url.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
  return url.toString().replace('%7BCHECKOUT_SESSION_ID%7D', '{CHECKOUT_SESSION_ID}');
}

function requireStripe(stripeClient) {
  if (!stripeClient) throw fail('Subscription billing requires Stripe configuration', 503);
}

export async function createSubscriptionCheckout({ db, stripeClient, tenantId, plan, returnUrl, requestId }) {
  requireStripe(stripeClient);
  if (!getCommercePlan(plan?.code) || plan.monthlyPriceCents !== getCommercePlan(plan.code).monthlyPriceCents) throw fail('Invalid commerce subscription plan', 400);
  if (!/^[a-zA-Z0-9_-]{8,120}$/.test(String(requestId || ''))) throw fail('A billing request id is required', 400);
  return db.$transaction(async (tx) => {
    await lockTenant(tx, tenantId);
    const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.isActive || tenant.isDemo || tenant.brandingJson?.businessType !== 'COMMERCE') throw fail('An active external commerce business is required', 403);
    const local = await tx.subscription.findUnique({ where: { tenantId } });
    if (!local) throw fail('Subscription setup is missing');
    if (local.providerSubscriptionId) {
      const existing = await stripeClient.subscriptions.retrieve(local.providerSubscriptionId);
      if (id(existing.customer) !== local.providerCustomerId || existing.metadata?.tenantId !== tenantId) throw fail('Subscription ownership could not be verified');
      if (!['canceled', 'incomplete_expired'].includes(existing.status)) throw fail('Manage the existing recurring subscription through billing settings');
      await tx.subscription.update({ where: { id: local.id }, data: { providerSubscriptionId: null, status: 'TRIALING', cancelAtPeriodEnd: false } });
    }
    let customerId = local.providerCustomerId;
    if (!customerId) {
      const customer = await stripeClient.customers.create({ email: tenant.email || undefined, name: tenant.name, metadata: { tenantId, billingPurpose: PURPOSE } }, { idempotencyKey: `billing-customer:${tenantId}` });
      customerId = customer.id;
      await tx.subscription.update({ where: { id: local.id }, data: { providerCustomerId: customerId } });
    }
    const subscriptions = await stripeClient.subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
    if (subscriptions.has_more) throw fail('Billing account history requires reconciliation before another subscription');
    if (subscriptions.data.some((subscription) => OPEN_STATUSES.has(subscription.status))) throw fail('A recurring subscription already exists for this business. Open billing settings.');
    if (subscriptions.data.some((subscription) => subscription.metadata?.billingPurpose === PURPOSE && subscription.trial_start)) throw fail('This business has already used its free trial. Contact support to reactivate billing.');
    const sessions = await stripeClient.checkout.sessions.list({ customer: customerId, status: 'open', limit: 100 });
    if (sessions.has_more) throw fail('Open billing checkouts require reconciliation');
    const openSession = sessions.data.find((session) => session.mode === 'subscription' && session.metadata?.billingPurpose === PURPOSE && session.metadata?.tenantId === tenantId);
    if (openSession) {
      if (openSession.metadata.planCode !== plan.code || Number(openSession.metadata.monthlyPriceCents) !== plan.monthlyPriceCents) throw fail('Finish or expire the existing checkout before choosing another plan');
      return { checkoutUrl: openSession.url, sessionId: openSession.id, recurring: true, interval: 'month', currency: 'cad', monthlyPriceCents: plan.monthlyPriceCents, reused: true };
    }
    const metadata = { billingPurpose: PURPOSE, tenantId, localSubscriptionId: local.id, planCode: plan.code, monthlyPriceCents: String(plan.monthlyPriceCents) };
    const session = await stripeClient.checkout.sessions.create({
      mode: 'subscription', customer: customerId, client_reference_id: tenantId,
      payment_method_types: ['card'], payment_method_collection: 'always',
      line_items: [{ quantity: 1, price_data: { currency: 'cad', unit_amount: plan.monthlyPriceCents, recurring: { interval: 'month', interval_count: 1 }, product_data: { name: `Loadlyx Commerce ${plan.name}` } } }],
      subscription_data: { metadata, trial_period_days: SUBSCRIPTION_TRIAL_DAYS, trial_settings: { end_behavior: { missing_payment_method: 'cancel' } } }, metadata,
      success_url: checkoutReturnUrl(returnUrl, 'success'), cancel_url: checkoutReturnUrl(returnUrl, 'cancelled')
    }, { idempotencyKey: `billing-checkout:${tenantId}:${requestId}` });
    return { checkoutUrl: session.url, sessionId: session.id, recurring: true, interval: 'month', currency: 'cad', monthlyPriceCents: plan.monthlyPriceCents };
  }, { maxWait: 10000, timeout: 30000 });
}

export function createRecurringCheckout({ db, stripeClient, tenant, plan, frontendUrl, requestId }) {
  return createSubscriptionCheckout({ db, stripeClient, tenantId: tenant?.id, plan, requestId, returnUrl: new URL('/admin/billing', frontendUrl).toString() });
}

export async function cancelRecurringSubscription({ db, stripeClient, tenantId }) {
  requireStripe(stripeClient);
  return db.$transaction(async (tx) => {
    await lockTenant(tx, tenantId);
    const local = await tx.subscription.findUnique({ where: { tenantId } });
    if (!local) throw fail('Subscription not found', 404);
    if (!local.providerSubscriptionId) return tx.subscription.update({ where: { id: local.id }, data: { cancelAtPeriodEnd: true } });
    const provider = await stripeClient.subscriptions.retrieve(local.providerSubscriptionId);
    if (id(provider.customer) !== local.providerCustomerId || provider.metadata?.tenantId !== tenantId) throw fail('Subscription ownership could not be verified');
    const updated = await stripeClient.subscriptions.update(provider.id, { cancel_at_period_end: true }, { idempotencyKey: `billing-cancel:${local.id}:${provider.id}` });
    const saved = await tx.subscription.update({ where: { id: local.id }, data: { cancelAtPeriodEnd: Boolean(updated.cancel_at_period_end) } });
    await tx.auditEvent.create({ data: { tenantId, action: 'SUBSCRIPTION_CANCEL_REQUESTED', entityType: 'SUBSCRIPTION', entityId: local.id, afterJson: { providerSubscriptionId: provider.id, cancelAtPeriodEnd: saved.cancelAtPeriodEnd } } });
    return saved;
  }, { maxWait: 10000, timeout: 30000 });
}

export function subscriptionState(provider) {
  if (provider.status === 'active') return 'ACTIVE';
  if (provider.status === 'trialing') return 'TRIALING';
  if (['canceled', 'incomplete_expired'].includes(provider.status)) return 'CANCELED';
  return 'PAST_DUE';
}

function subscriptionData(provider, local) {
  const metadata = provider.metadata || {};
  const plan = getCommercePlan(metadata.planCode);
  const item = provider.items?.data?.[0];
  const price = item?.price;
  const monthlyPriceCents = Number(metadata.monthlyPriceCents);
  if (!plan || metadata.localSubscriptionId !== local.id || metadata.tenantId !== local.tenantId || id(provider.customer) !== local.providerCustomerId) throw fail('Subscription ownership does not match');
  if (local.providerSubscriptionId && local.providerSubscriptionId !== provider.id) throw fail('A different subscription is already linked');
  if (provider.items?.data?.length !== 1 || item.quantity !== 1 || price?.currency !== 'cad' || price?.recurring?.interval !== 'month' || (price.recurring.interval_count || 1) !== 1 || !Number.isSafeInteger(monthlyPriceCents) || monthlyPriceCents <= 0 || price.unit_amount !== monthlyPriceCents) throw fail('Subscription must use the agreed monthly CAD price');
  const start = provider.current_period_start || item.current_period_start;
  const end = provider.current_period_end || item.current_period_end;
  return {
    providerSubscriptionId: provider.id, providerCustomerId: id(provider.customer), planCode: plan.code,
    monthlyPriceCents, currency: 'cad', status: subscriptionState(provider),
    cancelAtPeriodEnd: Boolean(provider.cancel_at_period_end),
    ...(start ? { currentPeriodStart: new Date(start * 1000) } : {}),
    ...(end ? { currentPeriodEnd: new Date(end * 1000) } : {})
  };
}

export async function handleSubscriptionEvent({ db, stripeClient, event }) {
  const object = event.data.object;
  const isCheckout = event.type === 'checkout.session.completed' && object.mode === 'subscription';
  const isSubscription = ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'customer.subscription.trial_will_end'].includes(event.type);
  const isInvoice = ['invoice.paid', 'invoice.payment_failed'].includes(event.type);
  if (!isCheckout && !isSubscription && !isInvoice) return false;
  const subscriptionId = isCheckout ? id(object.subscription) : isSubscription ? object.id : id(object.subscription || object.parent?.subscription_details?.subscription);
  if (!subscriptionId) return false;
  const provider = await stripeClient.subscriptions.retrieve(subscriptionId);
  if (provider.metadata?.billingPurpose !== PURPOSE) return false;
  const tenantId = provider.metadata.tenantId;
  if (!tenantId) throw fail('Subscription tenant identity is missing');
  await db.$transaction(async (tx) => {
    await lockTenant(tx, tenantId);
    const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.isDemo) throw fail('Subscription tenant is not eligible');
    const local = await tx.subscription.findUnique({ where: { tenantId } });
    if (!local) throw fail('Subscription is not provisioned');
    if (['canceled', 'incomplete_expired'].includes(provider.status) && local.providerSubscriptionId !== provider.id) return;
    const data = subscriptionData(provider, local);
    const changed = local.status !== data.status || local.providerSubscriptionId !== data.providerSubscriptionId || local.cancelAtPeriodEnd !== data.cancelAtPeriodEnd;
    const saved = await tx.subscription.update({ where: { id: local.id }, data });
    await tx.tenant.update({ where: { id: tenantId }, data: { subscriptionPlan: data.planCode.toLowerCase() } });
    if (changed) await tx.auditEvent.create({ data: { tenantId, action: 'SUBSCRIPTION_PROVIDER_SYNCED', entityType: 'SUBSCRIPTION', entityId: local.id, afterJson: { providerSubscriptionId: provider.id, planCode: data.planCode, status: data.status, eventId: event.id || null } } });
    if (isInvoice && event.type === 'invoice.paid') {
      if (object.status !== 'paid' || id(object.customer) !== local.providerCustomerId || object.currency !== data.currency || !Number.isSafeInteger(object.amount_paid) || object.amount_paid < 0) throw fail('Paid invoice does not match the subscription');
      await recordSubscriptionPayment(tx, { ...saved, monthlyPriceCents: object.amount_paid, currency: object.currency }, object.id);
    }
  }, { maxWait: 10000, timeout: 30000 });
  if (event.type === 'customer.subscription.trial_will_end' && provider.status === 'trialing' && !provider.cancel_at_period_end) {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    await sendTrialEndingEmail(tenant, provider);
  }
  return true;
}
