export function storefrontPaymentMethodState(methods, key) {
  const method = methods?.[key];
  if (!method) return { enabled: false, note: 'Checking availability…', assets: [] };
  if (key === 'card') return { enabled: ['CONFIGURED', 'SANDBOX'].includes(method.status), note: method.status === 'SANDBOX' ? 'Stripe test mode' : method.tenantConnected ? 'Stripe Connect' : 'Processed securely by Stripe', assets: [] };
  if (key === 'paypal') return { enabled: ['CONFIGURED', 'SANDBOX'].includes(method.status), note: method.status === 'SANDBOX' ? 'PayPal sandbox' : method.status === 'CONFIGURED' ? 'Pay with PayPal or an eligible card' : 'Tenant PayPal connection required', assets: [] };
  const assets = (method.acceptedAssets || []).filter((asset) => ['ADA', 'SOL'].includes(asset));
  return { enabled: method.status === 'CONFIGURED' && assets.length > 0, note: method.status === 'MOCK' ? 'Test-only crypto is not accepted as payment' : assets.length ? 'Wallet and listener verification required' : 'ADA/SOL receiving setup required', assets };
}