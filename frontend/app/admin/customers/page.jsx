'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function CustomersAdminPage() {
const [customers, setCustomers] = useState([]);

useEffect(() => {
const tenantId =
localStorage.getItem('tenantId');

fetch(`${API_URL}/customers`, {
headers: {
'x-tenant-id': tenantId || ''
}
})
.then((res) => res.json())
.then((data) => {
console.log(
'tenantId:',
tenantId
);

console.log(
'customers response:',
data
);

setCustomers(
Array.isArray(data)
? data
: data.customers || []
);
})
.catch(console.error);
}, []);

return (
<main style={{ padding: 32 }}>
<h1 style={{ marginBottom: 24 }}>
Customers
</h1>

{!customers.length ? (
<p>No customers found.</p>
) : (
<div
style={{
display: 'grid',
gap: 16
}}
>
{customers.map((customer) => (
<div
key={customer.id}
style={{
background: '#fff',
border:
'1px solid #e5e7eb',
borderRadius: 16,
padding: 20
}}
>
<strong>
{customer.name ||
'Unnamed Customer'}
</strong>

<p>
Email:{' '}
{customer.email}
</p>

<p>
Phone:{' '}
{customer.phone ||
'N/A'}
</p>

{customer.address ? (
<p>
Address:{' '}
{customer.address
.address || ''}{' '}
{customer.address
.city || ''}{' '}
{customer.address
.province || ''}{' '}
{customer.address
.postalCode || ''}
</p>
) : (
<p>Address: N/A</p>
)}
</div>
))}
</div>
)}
</main>
);
}
