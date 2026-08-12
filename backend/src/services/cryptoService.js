import crypto from 'crypto';

export const SUPPORTED_ASSETS = Object.freeze({ BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', ADA: 'cardano', USDC: 'multi', USDT: 'multi' });
export const CHAIN_STATUSES = Object.freeze(['DISABLED','MOCK','TESTNET','LIVE','ERROR']);

export class CryptoChainProvider {
  constructor({ key, network, status, treasuryAddress, explorerBaseUrl }) { this.key = key; this.network = network; this.status = status; this.treasuryAddress = treasuryAddress; this.explorerBaseUrl = explorerBaseUrl; }
  validateAddress(address) { return typeof address === 'string' && address.trim().length >= 20; }
  async createPaymentRequest() { throw new Error(`${this.key} payment request adapter is not configured`); }
  async getTransaction() { throw new Error(`${this.key} transaction adapter is not configured`); }
  async verifyTransfer() { throw new Error(`${this.key} transfer verification adapter is not configured`); }
  async getConfirmations() { throw new Error(`${this.key} confirmation adapter is not configured`); }
  async estimateFee() { throw new Error(`${this.key} fee adapter is not configured`); }
  getExplorerUrl(transactionHash) { return this.explorerBaseUrl && transactionHash ? `${this.explorerBaseUrl}${transactionHash}` : null; }
}

export function cryptoChainReadiness(key) {
  const upper = String(key).toUpperCase();
  const network = process.env[`${upper}_NETWORK`] || 'DISABLED';
  const rpcUrl = process.env[`${upper}_RPC_URL`] || '';
  const treasuryAddress = process.env[`${upper}_TREASURY_ADDRESS`] || '';
  const enabled = Boolean(rpcUrl && treasuryAddress);
  const requested = String(process.env[`${upper}_STATUS`] || (enabled ? 'TESTNET' : 'DISABLED')).toUpperCase();
  const status = CHAIN_STATUSES.includes(requested) ? requested : 'ERROR';
  return { key: upper, network, status: enabled ? status : 'DISABLED', configured: enabled, listenerConfigured: Boolean(process.env.CRYPTO_LISTENER_ENABLED === 'true' && rpcUrl), treasuryConfigured: Boolean(treasuryAddress), withdrawalsConfigured: false };
}

export function chainSupportMatrix() { return ['SOL','ADA','ETH','BTC'].map(cryptoChainReadiness); }

export function validateObservedTransfer({ invoice, transfer }) {
  if (!invoice || !transfer) throw new Error('Invoice and transfer are required');
  if (transfer.transactionHash !== invoice.transactionHash && invoice.transactionHash) throw new Error('Transaction hash mismatch');
  if (String(transfer.chain).toLowerCase() !== String(invoice.chain).toLowerCase()) throw new Error('Wrong chain');
  if (String(transfer.asset).toUpperCase() !== String(invoice.asset).toUpperCase()) throw new Error('Wrong asset');
  if (String(transfer.destination) !== String(invoice.paymentAddress)) throw new Error('Wrong recipient');
  if (!Number.isFinite(Number(transfer.amount)) || Number(transfer.amount) <= 0) throw new Error('Invalid transfer amount');
  return true;
}

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
