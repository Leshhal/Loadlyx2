import test from 'node:test';
import assert from 'node:assert/strict';
import { tenantSlugFromPath } from '../lib/tenant.js';

test('tenant path is authoritative for nested storefront routes',()=>{assert.equal(tenantSlugFromPath('/tenant/yxetotes/catalog'),'yxetotes');assert.equal(tenantSlugFromPath('/tenant/cansask/checkout?cart=1'),'cansask');});
test('tenant path rejects reserved and malformed slugs',()=>{assert.equal(tenantSlugFromPath('/tenant/admin/catalog'),null);assert.equal(tenantSlugFromPath('/tenant/../catalog'),null);});
