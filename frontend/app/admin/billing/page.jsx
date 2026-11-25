'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { COMMERCE_PLANS, monthlyPrice } from '../../../lib/commercePlans';
import { ErrorState, LoadingState, PageHeader } from '../../../components/ui/LoadlyxUI';

export default function CommerceBillingPage() {
  const [billing, setBilling] = useState(null);
  const [plans, setPlans] = useState(COMMERCE_PLANS);
  const [planCode, setPlanCode] = useState('STARTER');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const checkoutKeys = useRef({});

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch('/finance/subscription'),
      apiFetch('/finance/plans?businessType=COMMERCE')
    ]).then(([state, options]) => {
      if (cancelled) return;
      setBilling(state);
      setPlans(options.plans || COMMERCE_PLANS);
      setPlanCode(state.subscription?.planCode || 'STARTER');
    }).catch((failure) => { if (!cancelled) setError(failure.message); });
    return () => { cancelled = true; };
  }, []);

  async function subscribe() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      checkoutKeys.current[planCode] ||= crypto.randomUUID();
      const result = await apiFetch('/finance/subscription/checkout', {
        method: 'POST',
        headers: { 'idempotency-key': checkoutKeys.current[planCode] },
        body: JSON.stringify({ planCode })
      });
      if (!result.checkoutUrl) throw new Error('Subscription checkout is unavailable. Please try again.');
      window.location.assign(result.checkoutUrl);
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  }

  async function cancelRenewal() {
    if (busy || !window.confirm('Cancel monthly renewal at the end of the current billing period?')) return;
    setBusy(true);
    setError('');
    try {
      const result = await apiFetch('/finance/subscription/cancel', { method: 'POST', body: '{}' });
      setBilling((current) => ({ ...current, subscription: result.subscription }));
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  const subscription = billing?.subscription;
  const selected = plans.find((plan) => plan.code === planCode);
  const subscribed = Boolean(subscription?.providerSubscriptionId) && subscription?.status !== 'CANCELED';
  return <main className="container grid" style={{ gap: 24 }}>
    <PageHeader title="Subscription & billing" description="Manage the monthly Loadlyx subscription for your store." />
    {error ? <ErrorState message={error} /> : null}
    {!billing ? <LoadingState label="Loading subscription" /> : <>
      <section className="card">
        <h2>Current subscription</h2>
        <p>{subscription?.planCode || 'No plan selected'} · {subscribed ? (subscription?.status || 'SETUP_REQUIRED').replaceAll('_', ' ') : 'Trial not enrolled'}</p>
        {subscribed ? <>
          <p>{monthlyPrice(subscription.monthlyPriceCents)} CAD per month.</p>
          {subscription.currentPeriodEnd ? <p>{subscription.cancelAtPeriodEnd ? 'Access through' : 'Current billing period ends'} {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-CA')}.</p> : null}
          {subscription.cancelAtPeriodEnd ? <p role="status">Renewal is cancelled.</p> : <button className="btn secondary" type="button" disabled={busy} onClick={cancelRenewal}>Cancel monthly renewal</button>}
        </> : <p>Enroll with a card through Stripe to start your 30-day trial. Your first subscription charge follows the trial.</p>}
        {billing.mode === 'TEST' ? <p role="status">Test payment mode</p> : null}
      </section>
      {!subscribed ? <section className="card">
        <h2>Choose a commerce plan</h2>
        <label>Plan<select value={planCode} disabled={busy} onChange={(event) => setPlanCode(event.target.value)}>
          {plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name} — {monthlyPrice(plan.monthlyPriceCents)} CAD/month</option>)}
        </select></label>
        <p>30 days free, then {selected ? `${monthlyPrice(selected.monthlyPriceCents)} CAD charged monthly` : 'your selected monthly subscription'}, renewing automatically until cancelled. Applicable taxes, sales commissions, and payment-processing charges are additional.</p>
        <p>Stripe collects your card and displays the first charge date. Cancel before the trial ends to avoid the first subscription charge.</p>
        {billing.checkoutAvailable === false ? <p role="status">Trial enrollment is unavailable until commerce onboarding readiness is verified. You can continue setting up your business.</p> : null}
        {billing.billingConfigured === false ? <p role="status">Subscription payments require platform configuration.</p> : null}
        <button className="btn" type="button" disabled={busy || billing.billingConfigured === false || billing.checkoutAvailable === false || !selected} onClick={subscribe}>{busy ? 'Opening checkout…' : 'Start 30-day trial with a card'}</button>
      </section> : null}
    </>}
  </main>;
}
