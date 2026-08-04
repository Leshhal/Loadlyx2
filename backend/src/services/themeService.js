const ALLOWED_LAYOUTS = new Set(['classic', 'modern', 'warm']);
const ALLOWED_SECTIONS = new Set(['hero', 'trust', 'products', 'customPages']);
const TOKEN_KEYS = new Set(['primaryColor', 'accentColor', 'fontFamily', 'buttonRadius', 'pageWidth']);

function safeString(value, maxLength = 200) {
  return String(value || '').trim().slice(0, maxLength);
}

function safeColor(value, fallback) {
  const candidate = safeString(value, 20);
  return /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate : fallback;
}

export function validateThemeManifest(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Theme manifest must be an object');
  const layout = ALLOWED_LAYOUTS.has(input.layout) ? input.layout : 'classic';
  const tokens = input.tokens && typeof input.tokens === 'object' ? input.tokens : {};
  const unknownTokens = Object.keys(tokens).filter((key) => !TOKEN_KEYS.has(key));
  if (unknownTokens.length) throw new Error(`Unsupported theme tokens: ${unknownTokens.join(', ')}`);

  const sections = Array.isArray(input.sections)
    ? [...new Set(input.sections.filter((section) => ALLOWED_SECTIONS.has(section)))]
    : ['hero', 'trust', 'products', 'customPages'];
  if (!sections.length) throw new Error('Theme must contain at least one approved section');

  return {
    layout,
    tokens: {
      primaryColor: safeColor(tokens.primaryColor, '#2f6df6'),
      accentColor: safeColor(tokens.accentColor, '#f2b843'),
      fontFamily: ['system', 'serif', 'sans'].includes(tokens.fontFamily) ? tokens.fontFamily : 'system',
      buttonRadius: /^\d{1,2}px$/.test(tokens.buttonRadius || '') ? tokens.buttonRadius : '12px',
      pageWidth: /^\d{3,4}px$/.test(tokens.pageWidth || '') ? tokens.pageWidth : '1200px'
    },
    sections
  };
}

export function mergeThemeSettings(manifest, settings = {}) {
  const validated = validateThemeManifest(manifest);
  return validateThemeManifest({
    ...validated,
    tokens: { ...validated.tokens, ...(settings.tokens || {}) },
    sections: settings.sections || validated.sections
  });
}
