import crypto from 'crypto';

export const AI_MODULES = new Set(['CRM', 'DISPATCH', 'MARKETPLACE', 'BROKER', 'CARRIER', 'STORE', 'CUSTOMER', 'ADMIN', 'SUPPORT']);

export function sanitizeAiInput(input) {
  const text = String(input || '').trim();
  if (!text || text.length > 12000) throw new Error('AI input must be between 1 and 12000 characters');
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

export function requestHash({ tenantId, userId, module, input }) {
  return crypto.createHash('sha256').update(JSON.stringify({ tenantId: tenantId || null, userId, module, input })).digest('hex');
}

export function extractCompatibleResponseText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  if (typeof data?.choices?.[0]?.message?.content === 'string') return data.choices[0].message.content.trim();
  return (data?.output || [])
    .flatMap((item) => Array.isArray(item?.content) ? item.content : [])
    .filter((item) => item?.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text.trim())
    .filter(Boolean)
    .join('\n');
}

class DisabledProvider {
  name = 'DISABLED';
  model = 'none';
  async generate() { throw new Error('AI provider is disabled'); }
}

class MockProvider {
  name = 'MOCK';
  model = 'deterministic-test';
  async generate({ module, input }) { return { text: `[${module}] ${input.slice(0, 240)}`, inputTokens: Math.ceil(input.length / 4), outputTokens: Math.ceil(Math.min(input.length, 240) / 4) }; }
}

class CompatibleHttpProvider {
  constructor() {
    this.name = 'OPENAI_COMPATIBLE';
    this.model = process.env.AI_MODEL || '';
    this.url = process.env.AI_API_URL || '';
    this.apiKey = process.env.AI_API_KEY || '';
    if (!this.model || !this.url || !this.apiKey) throw new Error('AI_API_URL, AI_API_KEY, and AI_MODEL are required');
  }
  async generate({ instructions, input }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS || 30000));
    try {
      const response = await fetch(this.url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` }, body: JSON.stringify({ model: this.model, instructions, input }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(`AI provider request failed with status ${response.status}`);
      const text = extractCompatibleResponseText(data);
      if (!text) throw new Error('AI provider returned no text');
      return {
        text,
        inputTokens: data.usage?.input_tokens || data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.output_tokens || data.usage?.completion_tokens || 0,
        requestId: response.headers.get('x-request-id') || data.id || null
      };
    } finally { clearTimeout(timer); }
  }
}

export function createAiProvider(mode = process.env.AI_PROVIDER || 'DISABLED') {
  if (mode === 'MOCK') return new MockProvider();
  if (mode === 'OPENAI_COMPATIBLE') return new CompatibleHttpProvider();
  return new DisabledProvider();
}
