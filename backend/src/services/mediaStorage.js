import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const TYPES = {
  'image/jpeg': { extension: 'jpg', signatures: [[0xff, 0xd8, 0xff]] },
  'image/png': { extension: 'png', signatures: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]] },
  'image/webp': { extension: 'webp', signatures: [] }
};

export const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_UPLOAD_BYTES || 8 * 1024 * 1024);

function hasSignature(buffer, signature) {
  return signature.every((byte, index) => buffer[index] === byte);
}

export function validateImageBuffer(buffer, declaredMimeType) {
  const type = TYPES[declaredMimeType];
  if (!type) throw new Error('Only JPEG, PNG, and WebP images are allowed');
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw new Error(`Image must be between 1 byte and ${MAX_IMAGE_BYTES} bytes`);

  const isWebp = declaredMimeType === 'image/webp'
    && buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  const signatureMatches = type.signatures.some((signature) => hasSignature(buffer, signature));
  if (!isWebp && !signatureMatches) throw new Error('Image contents do not match the declared file type');
  return type;
}

export function parseDataUrl(dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(String(dataUrl || ''));
  if (!match) throw new Error('A valid JPEG, PNG, or WebP data URL is required');
  const buffer = Buffer.from(match[2], 'base64');
  const type = validateImageBuffer(buffer, match[1]);
  return { buffer, mimeType: match[1], extension: type.extension };
}

export function imageDimensions(buffer, mimeType) {
  if (mimeType === 'image/png' && buffer.length >= 24) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (mimeType === 'image/jpeg') {
    let offset = 2;
    while (offset + 8 < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  return { width: null, height: null };
}

function safeTenantSegment(tenantId) {
  return String(tenantId).replace(/[^a-zA-Z0-9_-]/g, '');
}

export class LocalMediaStorage {
  constructor(rootDirectory = process.env.MEDIA_STORAGE_PATH || path.resolve('storage', 'media')) {
    this.rootDirectory = path.resolve(rootDirectory);
  }

  async put({ tenantId, buffer, extension }) {
    const tenantSegment = safeTenantSegment(tenantId);
    if (!tenantSegment) throw new Error('Invalid tenant identifier');
    const storageKey = `${tenantSegment}/${crypto.randomUUID()}.${extension}`;
    const absolutePath = path.resolve(this.rootDirectory, ...storageKey.split('/'));
    if (!absolutePath.startsWith(this.rootDirectory + path.sep)) throw new Error('Unsafe media path');
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer, { flag: 'wx' });
    return { provider: 'LOCAL', storageKey };
  }

  async read(storageKey) {
    const absolutePath = path.resolve(this.rootDirectory, ...String(storageKey).split('/'));
    if (!absolutePath.startsWith(this.rootDirectory + path.sep)) throw new Error('Unsafe media path');
    return fs.readFile(absolutePath);
  }

  async remove(storageKey) {
    const absolutePath = path.resolve(this.rootDirectory, ...String(storageKey).split('/'));
    if (!absolutePath.startsWith(this.rootDirectory + path.sep)) throw new Error('Unsafe media path');
    await fs.unlink(absolutePath).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}

export function createMediaStorage() {
  const provider = String(process.env.MEDIA_STORAGE_PROVIDER || 'LOCAL').toUpperCase();
  if (provider !== 'LOCAL') {
    throw new Error(`Media provider ${provider} is configured but its deployment adapter is not installed`);
  }
  return new LocalMediaStorage();
}

export function checksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
