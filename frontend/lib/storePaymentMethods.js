export function storefrontPaymentMethodState(methods, key) {
  const method = methods?.[key];
  if (!method) return { enabled: false, note: 'Checking availability…', assets: [] };
  if (key === 'card') return { enabled: ['LIVE', 'TEST', 'CONFIGURED', 'SANDBOX'].includes(method.status), note: ['TEST', 'SANDBOX'].includes(method.status) ? 'Stripe test mode' : method.tenantConnected ? 'Stripe Connect' : 'Processed securely by Stripe', assets: [] };
  if (key === 'affirm') return { enabled: ['SANDBOX READY', 'PRODUCTION CONFIGURED'].includes(method.status) && method.available === true, note: method.status === 'SANDBOX READY' ? 'Affirm sandbox' : method.status === 'PRODUCTION CONFIGURED' ? 'Production configured; live transaction not yet verified' : method.status === 'NOT CONFIGURED' ? 'Merchant configuration required' : 'Not available for this store', assets: [] };
  if (key === 'paypal') return { enabled: ['LIVE', 'TEST', 'CONFIGURED', 'SANDBOX'].includes(method.status), note: ['TEST', 'SANDBOX'].includes(method.status) ? 'PayPal sandbox' : ['LIVE', 'CONFIGURED'].includes(method.status) ? 'Pay with PayPal or an eligible card' : 'Tenant PayPal connection required', assets: [] };
  const assets = (method.acceptedAssets || []).filter((asset) => ['ADA', 'SOL'].includes(asset));
  return { enabled: method.status === 'CONFIGURED' && assets.length > 0, note: method.status === 'MOCK' ? 'Test-only crypto is not accepted as payment' : assets.length ? 'Wallet and listener verification required' : 'ADA/SOL receiving setup required', assets };
}
