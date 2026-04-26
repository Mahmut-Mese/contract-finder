'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface Job {
  id: number;
  external_id: string;
  source: string;
  title: string;
  company: string | null;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  contract_type: string | null;
  redirect_url: string | null;
  posted_at: string | null;
  fetched_at: string;
}

interface FetchLog {
  id: number;
  started_at: string;
  finished_at: string | null;
  source: string;
  jobs_fetched: number;
  jobs_new: number;
  jobs_duplicate: number;
  status: string;
  error_message: string | null;
}

interface MatchLog {
  id: number;
  started_at: string;
  finished_at: string | null;
  users_processed: number;
  matches_created: number;
  emails_sent: number;
  status: string;
  error_message: string | null;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [fetchLogs, setFetchLogs] = useState<FetchLog[]>([]);
  const [matchLogs, setMatchLogs] = useState<MatchLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<'jobs' | 'fetch-logs' | 'match-logs'>('jobs');

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs?limit=100');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setJobs(data.jobs);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    }
  }, []);

  const loadFetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/fetch-logs');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFetchLogs(data.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fetch logs');
    }
  }, []);

  const loadMatchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/match-logs');
      const data = await res.json();
      if (!data.error) setMatchLogs(data.logs || []);
    } catch {
      // Non-critical — silently ignore if endpoint not yet available
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([loadJobs(), loadFetchLogs(), loadMatchLogs()]);
    setLoading(false);
  }, [loadJobs, loadFetchLogs, loadMatchLogs]);

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [loadAll, isAdmin]);

  const triggerFetch = async () => {
    setFetching(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/fetch-jobs', { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuccessMsg(
        `Fetch complete — fetched: ${data.jobsFetched}, new: ${data.jobsNew}, dupes: ${data.jobsDuplicate}`
      );
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      setFetching(false);
    }
  };

  const triggerMatch = async () => {
    setMatching(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/cron/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuccessMsg(
        `Matching complete — users: ${data.usersProcessed}, matches: ${data.matchesCreated}, emails: ${data.emailsSent}`
      );
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Match pipeline failed');
    } finally {
      setMatching(false);
    }
  };

  const formatSalary = (min: number | null, max: number | null, currency: string) => {
    if (!min && !max) return '—';
    const fmt = (n: number) => `${currency} ${n.toLocaleString()}`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (min) return `${fmt(min)}+`;
    return `Up to ${fmt(max!)}`;
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const statusBadge = (status: string) => (
    <span style={{
      padding: '2px 8px',
      borderRadius: 12,
      fontSize: '0.75rem',
      fontWeight: 600,
      background: status === 'completed' ? '#dcfce7' : status === 'failed' ? '#fef2f2' : '#fef9c3',
      color: status === 'completed' ? '#166534' : status === 'failed' ? '#991b1b' : '#854d0e',
    }}>
      {status}
    </span>
  );

  // Loading state
  if (status === 'loading') {
    return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-geist-sans)' }}>Loading...</div>;
  }

  // Access denied for non-admins
  if (!isAdmin) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '4rem 2rem', textAlign: 'center', fontFamily: 'var(--font-geist-sans)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#991b1b', marginBottom: '1rem' }}>Access Denied</h1>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>You don&apos;t have permission to access the admin panel.</p>
        <a href="/dashboard" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>Go to Dashboard</a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Contract Finder — Admin</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={triggerFetch}
            disabled={fetching || matching}
            style={{ ...btnStyle, background: '#2563eb', color: 'white' }}
          >
            {fetching ? 'Fetching...' : 'Fetch Jobs'}
          </button>
          <button
            onClick={triggerMatch}
            disabled={fetching || matching}
            style={{ ...btnStyle, background: '#16a34a', color: 'white' }}
          >
            {matching ? 'Matching...' : 'Run Matching'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, marginBottom: '1rem', color: '#991b1b', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '0.75rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, marginBottom: '1rem', color: '#166534', fontSize: '0.875rem' }}>
          {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
        {([['jobs', `Jobs (${total})`], ['fetch-logs', `Fetch Logs (${fetchLogs.length})`], ['match-logs', `Match Logs (${matchLogs.length})`]] as [string, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            style={{
              ...tabStyle,
              borderBottom: tab === key ? '2px solid #2563eb' : '2px solid transparent',
              color: tab === key ? '#2563eb' : '#374151',
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Jobs tab */}
      {tab === 'jobs' && (
        <div style={{ overflowX: 'auto' }}>
          {jobs.length === 0 ? (
            <p style={{ color: '#6b7280', padding: '2rem', textAlign: 'center' }}>
              No jobs yet. Click &quot;Fetch Jobs&quot; to pull from Adzuna.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Company</th>
                  <th style={thStyle}>Location</th>
                  <th style={thStyle}>Salary</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Posted</th>
                  <th style={thStyle}>Link</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={tdStyle}>{job.title}</td>
                    <td style={tdStyle}>{job.company || '—'}</td>
                    <td style={tdStyle}>{job.location || '—'}</td>
                    <td style={tdStyle}>{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</td>
                    <td style={tdStyle}>{job.contract_type || '—'}</td>
                    <td style={tdStyle}>{formatDate(job.posted_at)}</td>
                    <td style={tdStyle}>
                      {job.redirect_url
                        ? <a href={job.redirect_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>View</a>
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Fetch logs tab */}
      {tab === 'fetch-logs' && (
        <div style={{ overflowX: 'auto' }}>
          {fetchLogs.length === 0 ? (
            <p style={{ color: '#6b7280', padding: '2rem', textAlign: 'center' }}>No fetch logs yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Started</th>
                  <th style={thStyle}>Finished</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Fetched</th>
                  <th style={thStyle}>New</th>
                  <th style={thStyle}>Dupes</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Error</th>
                </tr>
              </thead>
              <tbody>
                {fetchLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={tdStyle}>{log.id}</td>
                    <td style={tdStyle}>{formatDate(log.started_at)}</td>
                    <td style={tdStyle}>{formatDate(log.finished_at)}</td>
                    <td style={tdStyle}>{log.source}</td>
                    <td style={tdStyle}>{log.jobs_fetched}</td>
                    <td style={tdStyle}>{log.jobs_new}</td>
                    <td style={tdStyle}>{log.jobs_duplicate}</td>
                    <td style={tdStyle}>{statusBadge(log.status)}</td>
                    <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.error_message || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Match logs tab */}
      {tab === 'match-logs' && (
        <div style={{ overflowX: 'auto' }}>
          {matchLogs.length === 0 ? (
            <p style={{ color: '#6b7280', padding: '2rem', textAlign: 'center' }}>
              No match logs yet. Click &quot;Run Matching&quot; to start.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Started</th>
                  <th style={thStyle}>Finished</th>
                  <th style={thStyle}>Users</th>
                  <th style={thStyle}>Matches</th>
                  <th style={thStyle}>Emails</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Error</th>
                </tr>
              </thead>
              <tbody>
                {matchLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={tdStyle}>{log.id}</td>
                    <td style={tdStyle}>{formatDate(log.started_at)}</td>
                    <td style={tdStyle}>{formatDate(log.finished_at)}</td>
                    <td style={tdStyle}>{log.users_processed}</td>
                    <td style={tdStyle}>{log.matches_created}</td>
                    <td style={tdStyle}>{log.emails_sent}</td>
                    <td style={tdStyle}>{statusBadge(log.status)}</td>
                    <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.error_message || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ── Styles ──
const btnStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 500,
  background: 'white',
};

const tabStyle: React.CSSProperties = {
  padding: '0.5rem 0',
  background: 'none',
  border: 'none',
  borderBottom: '2px solid transparent',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 600,
};

const thStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  fontWeight: 600,
  color: '#6b7280',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  whiteSpace: 'nowrap',
};
