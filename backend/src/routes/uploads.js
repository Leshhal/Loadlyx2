import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../db/prisma.js';
import { requireAuth } from '../middleware/requireauth.js';
import { checksum, createMediaStorage, imageDimensions, parseDataUrl } from '../services/mediaStorage.js';

const router = Router();
const PLATFORM_ROLES = new Set(['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'SUPPORT']);

function uploadTenantId(req) {
  if (req.user?.tenantId) return req.user.tenantId;
  if (PLATFORM_ROLES.has(req.user?.role) && req.tenant?.id) return req.tenant.id;
  return null;
}
const uploadSchema = z.object({
  dataUrl: z.string().min(20),
  fileName: z.string().max(255).optional(),
  altText: z.string().max(500).optional()
});

function publicAssetUrl(req, id) {
  const configured = String(process.env.BACKEND_PUBLIC_URL || '').replace(/\/$/, '');
  return `${configured || `${req.protocol}://${req.get('host')}`}/api/uploads/assets/${id}`;
}

router.get('/assets/:id', async (req, res, next) => {
  try {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
    if (!asset || asset.status !== 'READY') return res.status(404).json({ error: 'Image not found' });
    const storage = createMediaStorage();
    const buffer = await storage.read(asset.storageKey);
    res.setHeader('Content-Type', asset.mimeType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
});

router.post('/images', requireAuth, async (req, res, next) => {
  let stored;
  try {
    const tenantId = uploadTenantId(req);
    if (!tenantId) return res.status(403).json({ error: 'Select a tenant before uploading images' });
    const input = uploadSchema.parse(req.body);
    const parsed = parseDataUrl(input.dataUrl);
    const dimensions = imageDimensions(parsed.buffer, parsed.mimeType);
    const storage = createMediaStorage();
    stored = await storage.put({ tenantId, buffer: parsed.buffer, extension: parsed.extension });

    const asset = await prisma.mediaAsset.create({
      data: {
        tenantId,
        provider: stored.provider,
        storageKey: stored.storageKey,
        url: 'pending',
        originalName: input.fileName ? input.fileName.replace(/[^a-zA-Z0-9._ -]/g, '').slice(0, 255) : null,
        altText: input.altText || null,
        mimeType: parsed.mimeType,
        sizeBytes: parsed.buffer.length,
        width: dimensions.width,
        height: dimensions.height,
        checksum: checksum(parsed.buffer)
      }
    });
    const url = publicAssetUrl(req, asset.id);
    const updated = await prisma.mediaAsset.update({ where: { id: asset.id }, data: { url } });
    return res.status(201).json(updated);
  } catch (error) {
    if (stored) {
      await createMediaStorage().remove(stored.storageKey).catch(() => {});
    }
    return next(error);
  }
});

router.delete('/images/:id', requireAuth, async (req, res, next) => {
  try {
    if (!req.user?.tenantId) return res.status(403).json({ error: 'Tenant account required' });
    const asset = await prisma.mediaAsset.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
    if (!asset) return res.status(404).json({ error: 'Image not found' });
    const usageCount = await prisma.productImage.count({ where: { assetId: asset.id } });
    if (usageCount) return res.status(409).json({ error: 'Image is attached to a product' });
    await createMediaStorage().remove(asset.storageKey);
    await prisma.mediaAsset.delete({ where: { id: asset.id } });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
