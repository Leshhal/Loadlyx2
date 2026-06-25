import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
throw new Error('JWT_SECRET is missing from environment variables');
}

// 🔐 Verify user is authenticated
export function requireAuth(req, res, next) {
try {
const authHeader = req.headers.authorization;

if (!authHeader || !authHeader.startsWith('Bearer ')) {
return res.status(401).json({ error: 'Unauthorized' });
}

const token = authHeader.split(' ')[1];

console.log('TOKEN RECEIVED (VERIFY):', token);
console.log('JWT_SECRET (VERIFY):', JWT_SECRET);

const decoded = jwt.verify(token, JWT_SECRET);

req.user = decoded;

next();
} catch (error) {
console.error('Auth error:', error.message);
return res.status(401).json({ error: 'Invalid or expired token' });
}
}

// 🔒 Verify user is admin
export function requireAdmin(req, res, next) {
if (!req.user) {
return res.status(401).json({ error: 'Unauthorized' });
}

const allowedRoles = ['PLATFORM_ADMIN', 'TENANT_ADMIN'];

if (!allowedRoles.includes(req.user.role)) {
return res.status(403).json({ error: 'Forbidden' });
}

next();
}
