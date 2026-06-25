'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function money(cents) {
return `$${((cents || 0) / 100).toFixed(2)}`;
}

export default function BalanceAdminPage() {
const [balance, setBalance] = useState(null);

useEffect(() => {
const tenantId = localStorage.getItem('tenantId');

fetch(`${API_URL}/balance`, {
headers: {
'x-tenant-id': tenantId || ''
}
})
.then((res) => res.json())
.then(setBalance)
.catch(console.error);
}, []);

if (!balance) {
return (
<main style={{ padding: 32 }}>
Loading balance...
</main>
);
}

return (
<main style={styles.page}>
<h1 style={styles.heading}>
Tenant Balance
</h1>

<div style={styles.grid}>
<div style={styles.card}>
<h3>Available</h3>
<p style={styles.amount}>
{money(balance.availableCents)}
</p>
</div>

<div style={styles.card}>
<h3>Pending</h3>
<p style={styles.amount}>
{money(balance.pendingCents)}
</p>
</div>

<div style={styles.card}>
<h3>Gross Sales</h3>
<p style={styles.amount}>
{money(balance.grossSalesCents)}
</p>
</div>

<div style={styles.card}>
<h3>Platform Fees</h3>
<p style={styles.amount}>
{money(balance.platformFeesCents)}
</p>
</div>
</div>

<div style={{ marginBottom: 24 }}>
<button
style={styles.withdrawButton}
onClick={async () => {
const tenantId =
localStorage.getItem('tenantId');

await fetch(
`${API_URL}/withdrawals/request`,
{
method: 'POST',
headers: {
'Content-Type':
'application/json',
'x-tenant-id':
tenantId || ''
},
body: JSON.stringify({
amountCents:
balance.availableCents
})
}
);

alert('Withdrawal requested');
}}
>
Request Withdrawal
</button>
</div>

<h2 style={{ marginBottom: 16 }}>
Recent Ledger Entries
</h2>

<div style={styles.ledger}>
{balance.ledger?.map((entry) => (
<div
key={entry.id}
style={styles.ledgerCard}
>
<div>
<strong>
{money(entry.netCents)}
</strong>
</div>

<div>
Status: {entry.status}
</div>

<div>
Gross:{' '}
{money(entry.grossCents)}
</div>

<div>
Fee:{' '}
{money(entry.feeCents)}
</div>

<div>
{new Date(
entry.createdAt
).toLocaleString()}
</div>
</div>
))}
</div>
</main>
);
}

const styles = {
page: {
padding: 32,
background: '#f9fafb',
minHeight: '100vh'
},

heading: {
fontSize: 32,
marginBottom: 24
},

grid: {
display: 'grid',
gridTemplateColumns:
'repeat(auto-fit, minmax(220px, 1fr))',
gap: 20,
marginBottom: 32
},

card: {
background: '#fff',
border: '1px solid #e5e7eb',
borderRadius: 16,
padding: 24
},

amount: {
fontSize: 28,
fontWeight: 700,
marginTop: 12
},

ledger: {
display: 'grid',
gap: 16
},

ledgerCard: {
background: '#fff',
border: '1px solid #e5e7eb',
borderRadius: 14,
padding: 20
},

withdrawButton: {
background: '#111827',
color: '#fff',
border: 'none',
borderRadius: 12,
padding: '14px 20px',
fontWeight: 700,
cursor: 'pointer'
}
};