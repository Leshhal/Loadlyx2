import crypto from 'crypto';

export const SUPPORTED_ASSETS = Object.freeze({ BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', ADA: 'cardano', USDC: 'multi', USDT: 'multi' });

export function calculateCryptoQuote({ fiatAmountCents, fiatPerAsset }) {
  if (!Number.isSafeInteger(fiatAmountCents) || fiatAmountCents <= 0) throw new Error('Invalid fiat amount');
  if (!Number.isFinite(fiatPerAsset) || fiatPerAsset <= 0) throw new Error('Invalid exchange rate');
  return { cryptoAmount: Number((fiatAmountCents / 100 / fiatPerAsset).toFixed(12)), exchangeRate: fiatPerAsset };
}

export function nextCryptoStatus({ expectedAmount, receivedAmount, confirmations, requiredConfirmations, expired = false }) {
  if (expired && Number(receivedAmount) === 0) return 'EXPIRED';
  const expected = Number(expectedAmount); const received = Number(receivedAmount);
  if (received <= 0) return 'AWAITING_PAYMENT';
  const tolerance = expected * 0.005;
  if (received < expected - tolerance) return 'UNDERPAID';
  if (received > expected + tolerance) return confirmations >= requiredConfirmations ? 'OVERPAID' : 'CONFIRMING';
  return confirmations >= requiredConfirmations ? 'PAID' : 'CONFIRMING';
}

export function verifyCryptoWebhook({ rawPayload, signature, secret }) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');
  const left = Buffer.from(expected); const right = Buffer.from(String(signature));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export class MockCryptoProvider {
  name = 'MOCK';
  async createInvoice({ orderId, asset, fiatAmountCents, expiryMinutes }) {
    const rateMap = { BTC: 100000, ETH: 5000, SOL: 250, ADA: 2, USDC: 1, USDT: 1 };
    const quote = calculateCryptoQuote({ fiatAmountCents, fiatPerAsset: rateMap[asset] });
    const providerInvoiceId = `mock_${orderId}`;
    const paymentAddress = `mock_${asset.toLowerCase()}_${crypto.createHash('sha256').update(orderId).digest('hex').slice(0, 24)}`;
    return { providerInvoiceId, ...quote, paymentAddress, qrPayload: `${asset}:${paymentAddress}?amount=${quote.cryptoAmount}`, expiresAt: new Date(Date.now() + expiryMinutes * 60000) };
  }
}

export function createCryptoProvider(name) {
  if (name === 'MOCK') return new MockCryptoProvider();
  throw new Error(`Crypto provider ${name} is not installed`);
}
