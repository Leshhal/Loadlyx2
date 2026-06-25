import { Router } from 'express';

const router = Router();
router.get('/', (req, res) => {
  res.json({ ok: true, service: 'loadlyx-backend', tenant: req.tenant?.slug || null });
});

export default router;
