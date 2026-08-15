UPDATE "User"
SET "emailVerifiedAt" = COALESCE("emailVerifiedAt", CURRENT_TIMESTAMP)
WHERE "isTestAccount" = true
  AND LOWER("email") IN (
    'admin@loadlyx.com',
    'demo@loadlyx.com',
    'saskmoves@gmail.com',
    'broker@loadlyx.com',
    'carrier@loadlyx.com',
    'customer@loadlyx.com'
  );
