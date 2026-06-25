import dotenv from 'dotenv';
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';

dotenv.config();

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
throw new Error('JWT_SECRET is missing from environment variables');
}

router.post('/register', async (req, res) => {
try {
const { fullName, email, password, tenantSlug, role } = req.body;

if (!email || !password) {
return res.status(400).json({ error: 'Email and password are required' });
}

const existingUser = await prisma.user.findUnique({
where: { email }
});

if (existingUser) {
return res.status(409).json({ error: 'User already exists' });
}

let tenantId = null;

if (tenantSlug) {
const tenant = await prisma.tenant.findUnique({
where: { slug: tenantSlug }
});

if (!tenant) {
return res.status(404).json({ error: 'Tenant not found' });
}

tenantId = tenant.id;
}

const passwordHash = await bcrypt.hash(password, 10);

const user = await prisma.user.create({
data: {
fullName: fullName || null,
email,
passwordHash,
tenantId,
role: role || 'TENANT_ADMIN'
}
});

return res.status(201).json({
message: 'User created successfully',
user: {
id: user.id,
fullName: user.fullName,
email: user.email,
role: user.role,
tenantId: user.tenantId
}
});
} catch (error) {
console.error('Register error:', error);
return res.status(500).json({ error: 'Failed to register user' });
}
});

router.post('/login', async (req, res) => {
try {
console.log('JWT_SECRET (LOGIN):', JWT_SECRET);

const { email, password } = req.body;

if (!email || !password) {
return res.status(400).json({ error: 'Email and password are required' });
}

const user = await prisma.user.findUnique({
where: { email },
include: { tenant: true }
});

if (!user || user.isActive === false) {
return res.status(401).json({ error: 'Invalid credentials' });
}

const validPassword = await bcrypt.compare(password, user.passwordHash);

if (!validPassword) {
return res.status(401).json({ error: 'Invalid credentials' });
}

const token = jwt.sign(
{
userId: user.id,
tenantId: user.tenantId,
role: user.role,
email: user.email
},
JWT_SECRET,
{ expiresIn: '7d' }
);

console.log('TOKEN ISSUED (LOGIN):', token);

return res.json({
message: 'Login successful',
token,
tenantSlug: user.tenant?.slug || null,
user: {
id: user.id,
fullName: user.fullName,
email: user.email,
role: user.role,
tenantId: user.tenantId
}
});
} catch (error) {
console.error('Login error:', error);
return res.status(500).json({ error: 'Failed to login' });
}
});

export default router;
