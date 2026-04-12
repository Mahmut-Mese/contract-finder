'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface Profile {
  skills: string | null;
  min_rate: number | null;
  max_rate: number | null;
  location: string | null;
  remote_preference: string | null;
  contract_length: string | null;
  search_fingerprint: string | null;
  contract_finder_enabled: boolean;
}

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
  description: string | null;
  salary_min: number | null;
  salary_max: number | null;
  contract_type: string | null;
  redirect_url: string | null;
  posted_at: string | null;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<MatchedJob[]>([]);
  const [matchTotal, setMatchTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchFilter, setMatchFilter] = useState<string>(''); // '' = all except dismissed
  const [page, setPage] = useState(0); // 0-indexed page number
  const PAGE_SIZE = 10;

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile');
      if (!res.ok) throw new Error('Failed to load profile');
      const data = await res.json();
      data.profile.contract_finder_enabled = Boolean(data.profile.contract_finder_enabled);
      setProfile(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMatches = useCallback(async () => {
    setMatchesLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      if (matchFilter) params.set('status', matchFilter);
      const res = await fetch(`/api/matches?${params}`);
      if (!res.ok) throw new Error('Failed to load matches');
      const data = await res.json();
      setMatches(data.matches || []);
      setMatchTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load matches:', err);
    } finally {
      setMatchesLoading(false);
    }
  }, [matchFilter, page]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const toggleFinder = async () => {
    if (!profile) return;
    setToggling(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_finder_enabled: !profile.contract_finder_enabled }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const data = await res.json();
      data.profile.contract_finder_enabled = Boolean(data.profile.contract_finder_enabled);
      setProfile(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle');
    } finally {
      setToggling(false);
    }
  };

  const updateMatchStatus = async (matchId: number, status: string) => {
    try {
      const res = await fetch('/api/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, status }),
      });
      if (!res.ok) throw new Error('Failed to update');
      // Remove from list if dismissed, or update in place
      if (status === 'dismissed') {
        setMatches((prev) => prev.filter((m) => m.match_id !== matchId));
        setMatchTotal((prev) => prev - 1);
      } else {
        setMatches((prev) =>
          prev.map((m) => (m.match_id === matchId ? { ...m, status } : m))
        );
      }
    } catch (err) {
      console.error('Failed to update match:', err);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-geist-sans)' }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem', fontFamily: 'var(--font-geist-sans)' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        Dashboard
      </h1>

      {error && (
        <div style={errorStyle}>{error}</div>
      )}

      {/* Contract Finder Toggle */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Contract Finder
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
              {profile?.contract_finder_enabled
                ? 'Actively matching you with contracts'
                : 'Paused — enable to receive matches'}
            </p>
          </div>
          <button
            onClick={toggleFinder}
            disabled={toggling}
            style={{
              ...toggleBtnStyle,
              background: profile?.contract_finder_enabled ? '#16a34a' : '#d1d5db',
            }}
          >
            <span
              style={{
                ...toggleKnobStyle,
                transform: profile?.contract_finder_enabled ? 'translateX(24px)' : 'translateX(0)',
              }}
            />
          </button>
        </div>
      </div>

      {/* Matched Jobs */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
            Matched Contracts {matchTotal > 0 && <span style={{ color: '#6b7280', fontWeight: 400 }}>({matchTotal})</span>}
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['', 'new', 'saved'].map((f) => (
              <button
                key={f}
                onClick={() => { setMatchFilter(f); setPage(0); }}
                style={{
                  ...filterBtnStyle,
                  background: matchFilter === f ? '#2563eb' : 'white',
                  color: matchFilter === f ? 'white' : '#374151',
                }}
              >
                {f === '' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {matchesLoading ? (
          <p style={{ textAlign: 'center', color: '#9ca3af', padding: '1rem' }}>Loading matches...</p>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
              {(profile?.skills?.length ?? 0) > 0
                ? 'No matches yet. Matches are generated automatically when new contracts are found.'
                : 'Complete your profile to start receiving matches.'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {matches.map((match) => (
                <MatchCard
                  key={match.match_id}
                  match={match}
                  onStatusChange={updateMatchStatus}
                />
              ))}
            </div>

            {/* Pagination */}
            {matchTotal > PAGE_SIZE && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6' }}>
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                  style={{
                    ...paginationBtnStyle,
                    opacity: page === 0 ? 0.4 : 1,
                    cursor: page === 0 ? 'default' : 'pointer',
                  }}
                >
                  ← Previous
                </button>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  Page {page + 1} of {Math.ceil(matchTotal / PAGE_SIZE)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= matchTotal}
                  style={{
                    ...paginationBtnStyle,
                    opacity: (page + 1) * PAGE_SIZE >= matchTotal ? 0.4 : 1,
                    cursor: (page + 1) * PAGE_SIZE >= matchTotal ? 'default' : 'pointer',
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Account Info */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Account</h2>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
          Signed in as <strong>{session?.user?.email}</strong>
        </p>
      </div>
    </div>
  );
}

// ── Components ──

function MatchCard({
  match,
  onStatusChange,
}: {
  match: MatchedJob;
  onStatusChange: (matchId: number, status: string) => void;
}) {
  const scoreColor =
    match.score >= 50 ? '#16a34a' : match.score >= 25 ? '#d97706' : '#9ca3af';

  const salaryDisplay =
    match.salary_min || match.salary_max
      ? `£${Math.round((match.salary_min || 0) / 220)}-${Math.round((match.salary_max || 0) / 220)}/day`
      : null;

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '1rem',
        background: match.status === 'new' ? '#f0f9ff' : 'white',
        borderLeft: `4px solid ${scoreColor}`,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
            {match.redirect_url ? (
              <a
                href={match.redirect_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#111827', textDecoration: 'none' }}
                onClick={() => {
                  if (match.status === 'new') onStatusChange(match.match_id, 'viewed');
                }}
              >
                {match.title}
              </a>
            ) : (
              match.title
            )}
          </h3>
          <p style={{ margin: '0.125rem 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
            {match.company || 'Unknown company'}
            {match.location ? ` · ${match.location}` : ''}
            {salaryDisplay ? ` · ${salaryDisplay}` : ''}
          </p>
        </div>
        <div
          style={{
            background: scoreColor,
            color: 'white',
            borderRadius: 20,
            padding: '0.25rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            flexShrink: 0,
            marginLeft: '0.5rem',
          }}
        >
          {match.score}%
        </div>
      </div>

      {/* Matched skills */}
      {match.matched_skills && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
          {match.matched_skills.split(',').map((skill) => (
            <span
              key={skill.trim()}
              style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                padding: '0.125rem 0.5rem',
                borderRadius: 12,
                fontSize: '0.7rem',
                fontWeight: 500,
              }}
            >
              {skill.trim()}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {match.status !== 'saved' && (
          <button
            onClick={() => onStatusChange(match.match_id, 'saved')}
            style={actionBtnStyle}
          >
            Save
          </button>
        )}
        {match.status === 'saved' && (
          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Saved</span>
        )}
        <button
          onClick={() => onStatusChange(match.match_id, 'dismissed')}
          style={{ ...actionBtnStyle, color: '#9ca3af' }}
        >
          Dismiss
        </button>
        {match.redirect_url && (
          <a
            href={match.redirect_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...actionBtnStyle, textDecoration: 'none', color: '#2563eb' }}
            onClick={() => {
              if (match.status === 'new') onStatusChange(match.match_id, 'viewed');
            }}
          >
            Go to Website ↗
          </a>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#d1d5db' }}>
          {match.posted_at ? new Date(match.posted_at).toLocaleDateString() : ''}
        </span>
      </div>
    </div>
  );
}

// ── Styles ──

const cardStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '1.5rem',
  marginBottom: '1rem',
};

const errorStyle: React.CSSProperties = {
  padding: '0.75rem',
  background: '#fef2f2',
  border: '1px solid #fca5a5',
  borderRadius: 6,
  color: '#991b1b',
  marginBottom: '1rem',
  fontSize: '0.875rem',
};

const toggleBtnStyle: React.CSSProperties = {
  width: 52,
  height: 28,
  borderRadius: 14,
  border: 'none',
  cursor: 'pointer',
  position: 'relative',
  transition: 'background 0.2s',
  flexShrink: 0,
};

const toggleKnobStyle: React.CSSProperties = {
  display: 'block',
  width: 22,
  height: 22,
  borderRadius: '50%',
  background: 'white',
  position: 'absolute',
  top: 3,
  left: 3,
  transition: 'transform 0.2s',
  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
};

const filterBtnStyle: React.CSSProperties = {
  padding: '0.25rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: 20,
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: 500,
};

const actionBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: 500,
  color: '#374151',
  padding: '0.25rem 0',
};

const paginationBtnStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  padding: '0.375rem 0.75rem',
  fontSize: '0.8rem',
  fontWeight: 500,
  color: '#374151',
};
