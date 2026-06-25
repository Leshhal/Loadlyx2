'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api';

export default function QuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/quotes').then(setQuotes).catch((err) => setError(err.message));
  }, []);

  return (
    <main className="container grid" style={{ gap: 24 }}>
      <section className="card">
        <h1>Quotes</h1>
        <p className="muted">Review moving requests, routes, and source attribution.</p>
        {error ? <p className="error">{error}</p> : null}
      </section>
      <section className="card">
        <table className="table">
          <thead><tr><th>Name</th><th>Route</th><th>Status</th><th>Source</th><th>Comments</th></tr></thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id}>
                <td>{quote.fullName}</td>
                <td>{quote.fromCity} → {quote.toCity}</td>
                <td>{quote.status}</td>
                <td>{quote.attributionUtmSource || 'direct/unknown'}</td>
                <td>{quote.comments || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
