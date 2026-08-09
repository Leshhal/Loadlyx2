export async function isFeatureEnabled(db, key, tenantId = null) {
  const flag = await db.featureFlag.findUnique({ where: { key } });
  if (!flag?.enabled) return false;
  const tenantIds = Array.isArray(flag.tenantIds) ? flag.tenantIds : [];
  return tenantIds.length === 0 || (tenantId && tenantIds.includes(tenantId));
}

export async function requireFeature(db, key, tenantId = null) {
  if (!await isFeatureEnabled(db, key, tenantId)) {
    const error = new Error(`${key} is disabled by platform policy`);
    error.statusCode = 403;
    error.code = 'FEATURE_DISABLED';
    throw error;
  }
}
