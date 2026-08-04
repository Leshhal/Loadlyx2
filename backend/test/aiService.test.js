import assert from 'node:assert/strict';
import test from 'node:test';

import { createAiProvider, extractCompatibleResponseText, requestHash, sanitizeAiInput } from '../src/services/aiService.js';

test('AI input is bounded and strips control characters', () => {
  assert.equal(sanitizeAiInput('  hello\u0000 world  '), 'hello world');
  assert.throws(() => sanitizeAiInput(''), /between 1 and 12000/);
  assert.throws(() => sanitizeAiInput('x'.repeat(12001)), /between 1 and 12000/);
});

test('request hash separates tenant contexts without storing prompt text', () => {
  const first = requestHash({ tenantId: 'tenant-a', userId: 'user-1', module: 'CRM', input: 'private prompt' });
  const second = requestHash({ tenantId: 'tenant-b', userId: 'user-1', module: 'CRM', input: 'private prompt' });
  assert.notEqual(first, second);
  assert.equal(first.includes('private prompt'), false);
});

test('mock provider is deterministic and reports usage', async () => {
  const provider = createAiProvider('MOCK');
  const result = await provider.generate({ module: 'STORE', input: 'Draft accessible alt text' });
  assert.equal(result.text, '[STORE] Draft accessible alt text');
  assert.ok(result.inputTokens > 0);
});

test('disabled provider fails closed', async () => {
  await assert.rejects(() => createAiProvider('DISABLED').generate({ input: 'test' }), /disabled/);
});

test('compatible provider extracts the official Responses API output shape', () => {
  const text = extractCompatibleResponseText({
    output: [{ type: 'message', content: [{ type: 'output_text', text: 'First' }, { type: 'output_text', text: 'Second' }] }]
  });
  assert.equal(text, 'First\nSecond');
});
