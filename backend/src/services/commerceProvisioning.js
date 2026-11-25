const BUSINESS_TYPES = new Set(['COMMERCE', 'MOVING_SERVICE', 'MARKETPLACE_LOGISTICS']);

export function normalizeBusinessType(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error('Choose a supported business type');
  const businessType = value.trim().toUpperCase();
  if (!BUSINESS_TYPES.has(businessType)) throw new Error('Choose a supported business type');
  return businessType;
}

export function commerceBranding(storeName) {
  return {
    theme: 'default',
    tenantPages: [],
    businessType: 'COMMERCE',
    footerHeading: storeName,
    commerce: {
      version: 1,
      entitlements: {
        storefront: true,
        products: true,
        categories: true,
        inventory: true,
        orders: true,
        customers: true,
        discounts: true,
        payments: true,
        ledger: true,
        analytics: true,
        domains: true,
        team: true,
        notifications: true,
        shipping: true,
        tax: true,
        loadboard: false,
        truckBoard: false,
        brokerTools: false,
        carrierTools: false,
        driverTools: false,
        movingQuotes: false,
        movingServices: false,
        dispatch: false,
        moveAndHold: false,
        quotes: false,
        marketplace: false,
        rentals: false
      },
      storefront: { status: 'DRAFT' },
      currency: 'CAD',
      country: 'CA',
      locale: 'en-CA',
      tax: { status: 'SETUP_REQUIRED', pricesIncludeTax: false },
      shipping: { status: 'SETUP_REQUIRED' },
      payment: { status: 'SETUP_REQUIRED' },
      notifications: { orderConfirmation: true, newOrder: true, refundConfirmation: true }
    }
  };
}

// Call only inside the signup transaction, after the owner's user record exists.
export async function finishCommerceProvisioning(tx, tenant, owner) {
  const brandingJson = {
    ...tenant.brandingJson,
    commerce: { ...tenant.brandingJson.commerce, ownerUserId: owner.id }
  };
  const updatedTenant = await tx.tenant.update({ where: { id: tenant.id }, data: { brandingJson } });
  await tx.tenantShippingConfig.upsert({
    where: { tenantId_provider: { tenantId: tenant.id, provider: 'MANUAL' } },
    update: {},
    create: {
      tenantId: tenant.id,
      provider: 'MANUAL',
      enabled: false,
      environment: 'SANDBOX',
      originCountry: 'CA',
      settingsJson: { status: 'SETUP_REQUIRED' }
    }
  });
  return { ...owner, tenant: updatedTenant };
}
