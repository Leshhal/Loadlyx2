import test from 'node:test';
import assert from 'node:assert/strict';

import { nonDemoTenantWhere } from '../src/routes/platformAdmin.js';

test('platform summary excludes demo loads without filtering required tenantId as null', () => {
  assert.deepEqual(nonDemoTenantWhere, { tenant: { isDemo: false } });
  assert.equal(Object.hasOwn(nonDemoTenantWhere, 'tenantId'), false);
});
