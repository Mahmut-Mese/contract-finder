'use client';

import { useState, useEffect, useCallback } from 'react';

interface MatchedJob {
  match_id: number;
  score: number;
  matched_skills: string | null;
  status: string;
  matched_at: string;
  job_id: number;
  title: string;
  company: string | null;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  redirect_url: string | null;
  posted_at: string | null;
}

const STATUSES = ['', 'new', 'viewed', 'saved', 'dismissed'];

export default function HistoryPage() {
  const [matches, setMatches] = useState<MatchedJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filter) params.set('status', filter);
      const res = await fetch(`/api/matches?${params}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setMatches(data.matches || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem', fontFamily: 'var(--font-geist-sans)' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Match History
      </h1>
      <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        All contracts that matched your profile, including dismissed items.
      </p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '0.375rem 0.875rem',
              border: '1px solid #d1d5db',
              borderRadius: 20,
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 500,
              background: filter === s ? '#2563eb' : 'white',
              color: filter === s ? 'white' : '#374151',
            }}
          >
            {s === '' ? `All (${total})` : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>Loading...</p>
      ) : matches.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
            No matches found{filter ? ` with status "${filter}"` : ''}.
          </p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={thStyle}>Score</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Title</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Company</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Skills</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Date</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => {
              const scoreColor =
                m.score >= 50 ? '#16a34a' : m.score >= 25 ? '#d97706' : '#9ca3af';
              return (
                <tr key={m.match_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={{ color: scoreColor, fontWeight: 700 }}>{m.score}%</span>
                  </td>
                  <td style={tdStyle}>
                    {m.redirect_url ? (
                      <a
                        href={m.redirect_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2563eb', textDecoration: 'none' }}
                      >
                        {m.title}
                      </a>
                    ) : (
                      m.title
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: '#6b7280' }}>{m.company || '—'}</td>
                  <td style={tdStyle}>
                    {m.matched_skills ? (
                      <span style={{ color: '#1d4ed8', fontSize: '0.75rem' }}>
                        {m.matched_skills}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={{
                      ...statusBadgeStyle,
                      background: statusColors[m.status] || '#f3f4f6',
                      color: statusTextColors[m.status] || '#374151',
                    }}>
                      {m.status}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: '#9ca3af', fontSize: '0.75rem' }}>
                    {m.matched_at ? new Date(m.matched_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const statusColors: Record<string, string> = {
  new: '#dbeafe',
  viewed: '#f3f4f6',
  saved: '#dcfce7',
  dismissed: '#fef2f2',
};

const statusTextColors: Record<string, string> = {
  new: '#1d4ed8',
  viewed: '#6b7280',
  saved: '#16a34a',
  dismissed: '#991b1b',
};

const cardStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '1rem',
  background: 'white',
};

const thStyle: React.CSSProperties = {
  padding: '0.75rem 0.5rem',
  fontWeight: 600,
  color: '#6b7280',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 0.5rem',
};

const statusBadgeStyle: React.CSSProperties = {
  padding: '0.125rem 0.5rem',
  borderRadius: 12,
  fontSize: '0.7rem',
  fontWeight: 500,
};
