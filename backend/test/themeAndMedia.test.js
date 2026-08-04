import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { LocalMediaStorage, parseDataUrl } from '../src/services/mediaStorage.js';
import { mergeThemeSettings, validateThemeManifest } from '../src/services/themeService.js';

const onePixelPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('theme manifest accepts only controlled layout, tokens, and sections', () => {
  const theme = validateThemeManifest({
    layout: 'modern',
    tokens: { primaryColor: '#112233', accentColor: '#abcdef', fontFamily: 'serif', buttonRadius: '18px', pageWidth: '1320px' },
    sections: ['hero', 'products', 'hero', 'untrusted-script']
  });
  assert.equal(theme.layout, 'modern');
  assert.deepEqual(theme.sections, ['hero', 'products']);
  assert.equal(theme.tokens.primaryColor, '#112233');
});

test('theme manifest rejects arbitrary configuration keys', () => {
  assert.throws(() => validateThemeManifest({ tokens: { javascript: 'alert(1)' }, sections: ['hero'] }), /Unsupported theme tokens/);
});

test('theme settings remain inside the approved manifest contract', () => {
  const merged = mergeThemeSettings({ layout: 'classic', tokens: {}, sections: ['hero'] }, { tokens: { primaryColor: '#445566' }, sections: ['products'] });
  assert.equal(merged.tokens.primaryColor, '#445566');
  assert.deepEqual(merged.sections, ['products']);
});

test('image upload validates content and writes inside the tenant directory', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'loadlyx-media-'));
  try {
    const parsed = parseDataUrl(onePixelPng);
    const storage = new LocalMediaStorage(root);
    const saved = await storage.put({ tenantId: 'tenant-safe', buffer: parsed.buffer, extension: parsed.extension });
    assert.match(saved.storageKey, /^tenant-safe\/[0-9a-f-]+\.png$/);
    assert.deepEqual(await storage.read(saved.storageKey), parsed.buffer);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('image upload rejects a MIME declaration that does not match file contents', () => {
  const fake = `data:image/png;base64,${Buffer.from('not an image').toString('base64')}`;
  assert.throws(() => parseDataUrl(fake), /contents do not match/);
});
