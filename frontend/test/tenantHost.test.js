import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalLoadboardPath, isLoadboardHostname, resolveTenantFromHostname, tenantPathParts } from '../lib/tenantHost.js';

test('resolves production, configurable, and local tenant hosts', () => {
  assert.equal(resolveTenantFromHostname('acme.loadlyx.com'), 'acme');
  assert.equal(resolveTenantFromHostname('acme.example.com', { rootDomain: 'example.com' }), 'acme');
  assert.equal(resolveTenantFromHostname('acme.localhost:3000'), 'acme');
  assert.equal(resolveTenantFromHostname('acme.loadlyx.local:3000'), 'acme');
});

test('resolves explicit Vercel preview tenant labels only when enabled', () => {
  assert.equal(resolveTenantFromHostname('acme---loadlyx-git-main.vercel.app', { allowVercelPreview: true }), 'acme');
  assert.equal(resolveTenantFromHostname('loadlyx-git-main.vercel.app', { allowVercelPreview: true }), null);
  assert.equal(resolveTenantFromHostname('acme---loadlyx-git-main.vercel.app'), null);
});

test('rejects root, reserved, nested, and malformed tenant hosts', () => {
  assert.equal(resolveTenantFromHostname('loadlyx.com'), null);
  assert.equal(resolveTenantFromHostname('www.loadlyx.com'), null);
  assert.equal(resolveTenantFromHostname('a.b.loadlyx.com'), null);
  assert.equal(resolveTenantFromHostname('-bad.loadlyx.com'), null);
  assert.equal(resolveTenantFromHostname('loads.loadlyx.com'), null);
  assert.equal(resolveTenantFromHostname('loadboard.loadlyx.com'), null);
});

test('recognizes the standalone loadboard host without treating it as a tenant', () => {
  assert.equal(isLoadboardHostname('loadboard.loadlyx.com'), true);
  assert.equal(isLoadboardHostname('loadboard.localhost:3000'), true);
  assert.equal(isLoadboardHostname('loadboard.example.com', { rootDomain: 'example.com' }), true);
  // Keep the original hostname as a backwards-compatible redirect alias.
  assert.equal(isLoadboardHostname('loads.loadlyx.com'), true);
  assert.equal(isLoadboardHostname('loads.localhost:3000'), true);
  assert.equal(isLoadboardHostname('loads.example.com', { rootDomain: 'example.com' }), true);
  assert.equal(isLoadboardHostname('demo.loadlyx.com'), false);
});

test('maps legacy public paths to canonical subdomain paths', () => {
  assert.deepEqual(tenantPathParts('/tenant/cansask/catalog?category=boxes'), { slug: 'cansask', pathname: '/catalog' });
  assert.equal(tenantPathParts('/tenant/loadboard/catalog'), null);
  assert.equal(canonicalLoadboardPath('/loadboard'), '/');
  assert.equal(canonicalLoadboardPath('/loadboard/signup'), '/signup');
  assert.equal(canonicalLoadboardPath('/pricing'), null);
});
