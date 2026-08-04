import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import { calculateCryptoQuote, createCryptoProvider, nextCryptoStatus, verifyCryptoWebhook } from '../src/services/cryptoService.js';

test('crypto quote locks a deterministic fiat conversion', () => {
  assert.deepEqual(calculateCryptoQuote({ fiatAmountCents: 10000, fiatPerAsset: 50000 }), { cryptoAmount: 0.002, exchangeRate: 50000 });
});

test('detected payments do not become paid before confirmations', () => {
  assert.equal(nextCryptoStatus({ expectedAmount: 1, receivedAmount: 1, confirmations: 0, requiredConfirmations: 2 }), 'CONFIRMING');
  assert.equal(nextCryptoStatus({ expectedAmount: 1, receivedAmount: 1, confirmations: 2, requiredConfirmations: 2 }), 'PAID');
});

test('underpayment, overpayment, and expiration are distinct states', () => {
  assert.equal(nextCryptoStatus({ expectedAmount: 1, receivedAmount: .5, confirmations: 3, requiredConfirmations: 2 }), 'UNDERPAID');
  assert.equal(nextCryptoStatus({ expectedAmount: 1, receivedAmount: 1.1, confirmations: 2, requiredConfirmations: 2 }), 'OVERPAID');
  assert.equal(nextCryptoStatus({ expectedAmount: 1, receivedAmount: 0, confirmations: 0, requiredConfirmations: 2, expired: true }), 'EXPIRED');
});

test('webhook signature verification fails closed', () => {
  const payload = JSON.stringify({ eventId: 'event-1' }); const secret = 'test-secret';
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  assert.equal(verifyCryptoWebhook({ rawPayload: payload, signature, secret }), true);
  assert.equal(verifyCryptoWebhook({ rawPayload: payload, signature: 'bad', secret }), false);
});

test('mock provider creates a test-only invoice', async () => {
  const invoice = await createCryptoProvider('MOCK').createInvoice({ orderId: 'order-1', asset: 'USDC', fiatAmountCents: 2500, expiryMinutes: 30 });
  assert.equal(invoice.cryptoAmount, 25);
  assert.match(invoice.paymentAddress, /^mock_usdc_/);
});
