'use client';

import { useState, useEffect } from 'react';

interface Application {
  id: number;
  status: string;
  applied_via: string;
  application_email: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  job_id: number;
  title: string;
  company: string | null;
  location: string | null;
  redirect_url: string | null;
  salary_min: number | null;
  salary_max: number | null;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/applications?limit=100');
        if (!res.ok) throw new Error('Failed to load applications');
        const data = await res.json();
        setApplications(data.applications || []);
        setTotal(data.total || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load applications');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-geist-sans)' }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          Applications {total > 0 && <span style={{ color: '#6b7280', fontWeight: 400 }}>({total})</span>}
        </h1>
        <a href="/dashboard" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← Dashboard
        </a>
      </div>

      {error && (
        <div style={errorStyle}>{error}</div>
      )}

      {applications.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
        }}>
          <p style={{ color: '#6b7280', fontSize: '0.95rem', margin: '0 0 1rem' }}>
            No applications yet.
          </p>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>
            Go to your <a href="/dashboard" style={{ color: '#2563eb', textDecoration: 'none' }}>Dashboard</a> and click "Apply" on a matched contract to get started.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {applications.map((app) => (
            <ApplicationCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({ app }: { app: Application }) {
  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    sent: { color: '#166534', bg: '#f0fdf4', label: 'Applied' },
    draft: { color: '#92400e', bg: '#fffbeb', label: 'Draft' },
    failed: { color: '#991b1b', bg: '#fef2f2', label: 'Failed' },
  };

  const status = statusConfig[app.status] || { color: '#6b7280', bg: '#f9fafb', label: app.status };

  const salaryDisplay =
    app.salary_min || app.salary_max
      ? `£${Math.round((app.salary_min || 0) / 220)}-${Math.round((app.salary_max || 0) / 220)}/day`
      : null;

  const viaLabel: Record<string, string> = {
    email: 'Via email',
    external_link: 'Via job listing',
    manual: 'Manual',
  };

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: '1rem',
      background: 'white',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
            {app.redirect_url ? (
              <a
                href={app.redirect_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#111827', textDecoration: 'none' }}
              >
                {app.title}
              </a>
            ) : (
              app.title
            )}
          </h3>
          <p style={{ margin: '0.125rem 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
            {app.company || 'Unknown company'}
            {app.location ? ` · ${app.location}` : ''}
            {salaryDisplay ? ` · ${salaryDisplay}` : ''}
          </p>
        </div>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: status.color,
          background: status.bg,
          padding: '0.125rem 0.5rem',
          borderRadius: 12,
          flexShrink: 0,
          marginLeft: '0.5rem',
        }}>
          {status.label}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.75rem', color: '#9ca3af' }}>
        <span>{new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        <span>{viaLabel[app.applied_via] || app.applied_via}</span>
        {app.error_message && (
          <span style={{ color: '#991b1b' }} title={app.error_message}>Error</span>
        )}
        {app.redirect_url && (
          <a
            href={app.redirect_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#2563eb', textDecoration: 'none', marginLeft: 'auto' }}
          >
            View listing ↗
          </a>
        )}
      </div>
    </div>
  );
}

const errorStyle: React.CSSProperties = {
  padding: '0.75rem',
  background: '#fef2f2',
  border: '1px solid #fca5a5',
  borderRadius: 6,
  color: '#991b1b',
  marginBottom: '1rem',
  fontSize: '0.875rem',
};
