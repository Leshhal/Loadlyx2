'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
const router = useRouter();

const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [error, setError] = useState('');

const handleLogin = async () => {
try {
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
method: 'POST',
headers: {
'Content-Type': 'application/json'
},
body: JSON.stringify({ email, password })
});

const data = await res.json();
console.log('LOGIN RESPONSE:', data);

if (!res.ok) {
console.log('LOGIN FAILED RESPONSE:', data);
setError(data.error || 'Login failed');
return;
}

console.log('LOGIN SUCCESS TOKEN:', data.token);
console.log('LOGIN SUCCESS TENANT:', data.tenantSlug);

localStorage.removeItem('token');
localStorage.setItem('token', String(data.token).trim());

if (data.tenantSlug) {
localStorage.setItem('tenantSlug', data.tenantSlug);
}

router.replace('/admin/dashboard');

} catch (err) {
setError('Something went wrong');
}
};

return (
<div style={{ padding: 20 }}>
<h2>Login</h2>

<input
placeholder="Email"
value={email}
onChange={(e) => setEmail(e.target.value)}
/>
<br /><br />

<input
placeholder="Password"
type="password"
value={password}
onChange={(e) => setPassword(e.target.value)}
/>
<br /><br />

<button onClick={handleLogin}>Login</button>

{error && <p style={{ color: 'red' }}>{error}</p>}
</div>
);
}
