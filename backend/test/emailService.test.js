import assert from 'node:assert/strict';
import test from 'node:test';
import { renderEmailTemplate } from '../src/services/emailService.js';

test('verification email is branded and escapes user content', () => {
  const email = renderEmailTemplate('verify-email', { name: '<script>alert(1)</script>', actionUrl: 'https://www.loadlyx.com/verify-email?token=safe' });
  assert.equal(email.subject, 'Verify your Loadlyx account');
  assert.match(email.html, /Loadlyx/);
  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.text, /https:\/\/www\.loadlyx\.com/);
});

test('password reset explains expiry and single use', () => {
  const email = renderEmailTemplate('reset-password', { name: 'Member', actionUrl: 'https://www.loadlyx.com/reset-password?token=safe' });
  assert.match(email.text, /expires in one hour/);
  assert.match(email.text, /only be used once/);
});
