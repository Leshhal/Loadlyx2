export const SUBSCRIPTION_PLANS = Object.freeze({
  STARTER: Object.freeze({ code: 'STARTER', name: 'Starter', monthlyPriceCents: 9900, annualPriceCents: 99000, features: ['Storefront and products', 'Quotes', 'Basic CRM'], entitlements: { storefront: true, products: true, quotes: true, crm: 'basic', dispatch: false, marketplace: false, ai: false, advancedReporting: false, staffSeats: 2 } }),
  GROWTH: Object.freeze({ code: 'GROWTH', name: 'Growth', monthlyPriceCents: 19900, annualPriceCents: 199000, features: ['Everything in Starter', 'Full CRM', 'Dispatch', 'Marketplace participation', 'AI assistance'], entitlements: { storefront: true, products: true, quotes: true, crm: 'full', dispatch: true, marketplace: true, ai: true, advancedReporting: false, staffSeats: 10 } }),
  PROFESSIONAL: Object.freeze({ code: 'PROFESSIONAL', name: 'Professional', monthlyPriceCents: 39900, annualPriceCents: 399000, features: ['Everything in Growth', 'Advanced reporting', 'Workflow automation', 'Priority operations'], entitlements: { storefront: true, products: true, quotes: true, crm: 'full', dispatch: true, marketplace: true, ai: true, advancedReporting: true, workflowAutomation: true, staffSeats: 50 } })
});

export function getSubscriptionPlan(code) {
  return SUBSCRIPTION_PLANS[String(code || '').trim().toUpperCase()] || null;
}
