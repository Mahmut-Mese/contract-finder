'use client';

import { useState, useEffect } from 'react';

interface ProfileData {
  skills: string | null;
  min_rate: number | null;
  max_rate: number | null;
  location: string | null;
  remote_preference: string | null;
  contract_length: string | null;
}

export default function ProfilePage() {
  const [skills, setSkills] = useState('');
  const [minRate, setMinRate] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [location, setLocation] = useState('');
  const [remotePref, setRemotePref] = useState('any');
  const [contractLength, setContractLength] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) throw new Error('Failed to load profile');
        const data = await res.json();
        const p: ProfileData = data.profile;
        setSkills(p.skills || '');
        setMinRate(p.min_rate != null ? String(p.min_rate) : '');
        setMaxRate(p.max_rate != null ? String(p.max_rate) : '');
        setLocation(p.location || '');
        setRemotePref(p.remote_preference || 'any');
        setContractLength(p.contract_length || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skills: skills || null,
          min_rate: minRate ? Number(minRate) : null,
          max_rate: maxRate ? Number(maxRate) : null,
          location: location || null,
          remote_preference: remotePref,
          contract_length: contractLength || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save profile');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-geist-sans)' }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Edit Profile</h1>
        <a href="/dashboard" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← Dashboard
        </a>
      </div>

      {error && <div style={errorStyle}>{error}</div>}
      {success && (
        <div style={successStyle}>
          Profile saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle} htmlFor="skills">Skills</label>
          <input
            id="skills"
            type="text"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="react, typescript, node.js, aws"
            style={inputStyle}
          />
          <p style={helpStyle}>Comma-separated list of your tech skills</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={labelStyle} htmlFor="minRate">Min Daily Rate (£)</label>
            <input
              id="minRate"
              type="number"
              value={minRate}
              onChange={(e) => setMinRate(e.target.value)}
              placeholder="500"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="maxRate">Max Daily Rate (£)</label>
            <input
              id="maxRate"
              type="number"
              value={maxRate}
              onChange={(e) => setMaxRate(e.target.value)}
              placeholder="750"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle} htmlFor="location">Location</label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="London, UK"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle} htmlFor="remotePref">Remote Preference</label>
          <select
            id="remotePref"
            value={remotePref}
            onChange={(e) => setRemotePref(e.target.value)}
            style={inputStyle}
          >
            <option value="any">Any</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle} htmlFor="contractLength">Contract Length</label>
          <input
            id="contractLength"
            type="text"
            value={contractLength}
            onChange={(e) => setContractLength(e.target.value)}
            placeholder="3-6 months"
            style={inputStyle}
          />
        </div>

        <button type="submit" disabled={saving} style={buttonStyle}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.25rem',
  fontWeight: 600,
  fontSize: '0.875rem',
  color: '#374151',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: '0.875rem',
  boxSizing: 'border-box',
};

const helpStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#9ca3af',
  marginTop: '0.25rem',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  background: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
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

const successStyle: React.CSSProperties = {
  padding: '0.75rem',
  background: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: 6,
  color: '#166534',
  marginBottom: '1rem',
  fontSize: '0.875rem',
};
