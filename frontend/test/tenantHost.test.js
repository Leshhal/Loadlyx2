import test from 'node:test';
import assert from 'node:assert/strict';
import { isLoadboardHostname, resolveTenantFromHostname } from '../lib/tenantHost.js';

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
});

test('recognizes the standalone loadboard host without treating it as a tenant', () => {
  assert.equal(isLoadboardHostname('loads.loadlyx.com'), true);
  assert.equal(isLoadboardHostname('loads.localhost:3000'), true);
  assert.equal(isLoadboardHostname('loads.example.com', { rootDomain: 'example.com' }), true);
  assert.equal(isLoadboardHostname('demo.loadlyx.com'), false);
});
