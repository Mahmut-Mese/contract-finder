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

interface CvInfo {
  id: number;
  originalName: string;
  fileSize: number;
  createdAt: string;
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
  const [cv, setCv] = useState<CvInfo | null>(null);
  const [cvLoading, setCvLoading] = useState(true);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvDeleting, setCvDeleting] = useState(false);
  const [cvError, setCvError] = useState<string | null>(null);
  const [cvSuccess, setCvSuccess] = useState<string | null>(null);

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

  // Load CV info
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/cv');
        if (!res.ok) throw new Error('Failed to load CV');
        const data = await res.json();
        setCv(data.cv || null);
      } catch {
        // Non-critical — CV section will show upload prompt
      } finally {
        setCvLoading(false);
      }
    })();
  }, []);

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCvError(null);
    setCvSuccess(null);
    setCvUploading(true);

    try {
      if (file.type !== 'application/pdf') {
        throw new Error('Only PDF files are allowed');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File too large. Maximum size is 5MB');
      }

      const formData = new FormData();
      formData.append('cv', file);

      const res = await fetch('/api/cv/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setCv(data.cv);
      setCvSuccess('CV uploaded successfully!');
      setTimeout(() => setCvSuccess(null), 3000);
    } catch (err) {
      setCvError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setCvUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleCvDelete = async () => {
    if (!confirm('Are you sure you want to delete your CV?')) return;

    setCvError(null);
    setCvSuccess(null);
    setCvDeleting(true);

    try {
      const res = await fetch('/api/cv', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
      setCv(null);
      setCvSuccess('CV deleted');
      setTimeout(() => setCvSuccess(null), 3000);
    } catch (err) {
      setCvError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setCvDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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

      {/* CV Upload Section */}
      <div style={{ marginTop: '2rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Your CV</h2>

        {cvError && <div style={errorStyle}>{cvError}</div>}
        {cvSuccess && <div style={successStyle}>{cvSuccess}</div>}

        {cvLoading ? (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Loading CV info...</p>
        ) : cv ? (
          <div style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <p style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>{cv.originalName}</p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                {formatFileSize(cv.fileSize)} · Uploaded {new Date(cv.createdAt).toLocaleDateString('en-GB')}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a
                href="/api/cv/download"
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: '#374151',
                  textDecoration: 'none',
                  background: 'white',
                }}
              >
                Download
              </a>
              <button
                onClick={handleCvDelete}
                disabled={cvDeleting}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid #fca5a5',
                  borderRadius: 6,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: '#991b1b',
                  background: 'white',
                  cursor: 'pointer',
                }}
              >
                {cvDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            border: '2px dashed #d1d5db',
            borderRadius: 8,
            padding: '2rem',
            textAlign: 'center',
          }}>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
              Upload your CV to enable one-click applications
            </p>
            <label style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              background: '#2563eb',
              color: 'white',
              borderRadius: 6,
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}>
              {cvUploading ? 'Uploading...' : 'Upload PDF'}
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleCvUpload}
                disabled={cvUploading}
                style={{ display: 'none' }}
              />
            </label>
            <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: '0.5rem 0 0' }}>
              PDF only, max 5MB
            </p>
          </div>
        )}

        {/* Replace CV button when one exists */}
        {cv && (
          <div style={{ marginTop: '0.75rem' }}>
            <label style={{
              fontSize: '0.8rem',
              color: '#2563eb',
              cursor: 'pointer',
              fontWeight: 500,
            }}>
              {cvUploading ? 'Uploading...' : 'Replace with new CV'}
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleCvUpload}
                disabled={cvUploading}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        )}
      </div>
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
