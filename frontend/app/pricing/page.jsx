import Link from 'next/link';
import { COMMERCE_PLANS } from '../../lib/commercePlans';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const descriptions = {
  STARTER: 'For a small store getting started.',
  GROWTH: 'For a growing store with staff.',
  PROFESSIONAL: 'For a larger store needing advanced reporting.'
};

async function getPlans() {
  try {
    const response = await fetch(`${API_URL}/finance/plans?businessType=COMMERCE`, { cache: 'no-store' });
    if (!response.ok) return COMMERCE_PLANS;
    const data = await response.json();
    return data.plans?.length ? data.plans : COMMERCE_PLANS;
  } catch {
    return COMMERCE_PLANS;
  }
}

export default async function PricingPage() {
  const plans = await getPlans();
  return <main className="lx-pricing-page">
    <section className="lx-pricing-hero">
      <span className="lx-eyebrow">Commerce plans</span>
      <h1>Start with a 30-day free trial.</h1>
      <p>Choose the plan that fits your store. A card is required for the trial, then your selected plan renews monthly. All prices are in Canadian dollars.</p>
    </section>
    <section className="lx-pricing-cards">
      {plans.map((plan) => {
        const featured = plan.code === 'GROWTH';
        const features = plan.features || plan.featuresJson || [];
        return <article className={featured ? 'lx-pricing-card featured' : 'lx-pricing-card'} key={plan.code}>
          {featured ? <span className="lx-plan-ribbon">For growing stores</span> : null}
          <span className="lx-eyebrow">{plan.name}</span>
          <div className="lx-plan-price"><strong>${(plan.monthlyPriceCents / 100).toFixed(0)}</strong><span>CAD<br />per month</span></div>
          <p>{descriptions[plan.code]}</p>
          <Link className={featured ? 'btn' : 'btn secondary'} href={`/signup?businessType=COMMERCE&plan=${String(plan.code).toLowerCase()}`}>Set up {plan.name}</Link>
          <ul>{features.map((feature) => <li key={feature}><span aria-hidden="true">✓</span>{String(feature).replaceAll('_', ' ')}</li>)}</ul>
        </article>;
      })}
    </section>
    <section className="lx-pricing-note">
      <strong>30 days free, then monthly billing until cancelled.</strong>
      <span>The trial starts when you complete card setup in Stripe. Trial enrollment opens after commerce onboarding readiness is verified. Cancel renewal from Subscription &amp; billing before your trial ends to avoid the first subscription charge. Applicable taxes, sales commissions, and payment-processing charges are additional.</span>
    </section>
    <section className="lx-pricing-faq">
      <div className="lx-section-heading lx-align-left"><h2>Subscription questions</h2></div>
      <div className="lx-faq-list">
        <details open><summary>When will I be charged?<span>+</span></summary><p>Your first subscription charge follows the 30-day trial. Stripe collects your card and shows the first charge date during trial enrollment. Your selected plan then renews monthly until cancelled.</p></details>
        <details><summary>How do I cancel?<span>+</span></summary><p>Open Subscription & billing in your store dashboard and cancel renewal. Your subscription remains active through the end of the paid period.</p></details>
        <details><summary>Are transaction fees included?<span>+</span></summary><p>The monthly subscription is separate from applicable sales commissions, payment-processing charges, and taxes.</p></details>
      </div>
    </section>
  </main>;
}
