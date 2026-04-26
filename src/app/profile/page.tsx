'use client';

import { useState, useEffect } from 'react';

interface ProfileData {
  skills: string | null;
  min_rate: number | null;
  max_rate: number | null;
  location: string | null;
  remote_preference: string | null;
  contract_length: string | null;
  contract_finder_enabled: boolean;
}

interface CvInfo {
  id: number;
  originalName: string;
  fileSize: number;
  createdAt: string;
}

interface FilterConfig {
  excludeCompanies?: string[];
  excludeTitleKeywords?: string[];
  minScore?: number;
  remoteOnly?: boolean;
  datePosted?: string;
  postedBy?: string;
  rateMin?: string;
  rateMax?: string;
  skillsFilter?: string;
  locationFilter?: string;
  remotePref?: string;
  contractLengthFilter?: string;
}

interface SavedFilter {
  id: number;
  name: string;
  is_active: number | boolean;
  filters: string | FilterConfig;
  created_at: string;
  updated_at: string;
}

export default function ProfilePage() {
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [minRate, setMinRate] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [location, setLocation] = useState('');
  const [remotePref, setRemotePref] = useState('any');
  const [contractLength, setContractLength] = useState('');
  const [finderEnabled, setFinderEnabled] = useState(false);
  const [toggling, setToggling] = useState(false);
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
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [editingFilterId, setEditingFilterId] = useState<number | null>(null);
  const [editingFilterName, setEditingFilterName] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) throw new Error('Failed to load profile');
        const data = await res.json();
        const p: ProfileData = data.profile;
        setSkillTags(p.skills ? p.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
        setMinRate(p.min_rate != null ? String(p.min_rate) : '');
        setMaxRate(p.max_rate != null ? String(p.max_rate) : '');
        setLocation(p.location || '');
        setRemotePref(p.remote_preference || 'any');
        setContractLength(p.contract_length || '');
        setFinderEnabled(Boolean(p.contract_finder_enabled));
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

  // Load saved filters
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/saved-searches');
        if (!res.ok) return;
        const data = await res.json();
        setSavedFilters(data.searches || []);
      } catch {
        // Non-critical
      }
    })();
  }, []);

  const toggleFilterActive = async (filter: SavedFilter) => {
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: filter.id, is_active: !Boolean(filter.is_active) }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setSavedFilters(prev => prev.map(f => 
        f.id === filter.id ? { ...f, is_active: !Boolean(f.is_active) } : f
      ));
    } catch (err) {
      console.error('Failed to toggle filter:', err);
    }
  };

  const renameFilter = async (id: number) => {
    if (!editingFilterName.trim()) return;
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editingFilterName.trim() }),
      });
      if (!res.ok) throw new Error('Failed to rename');
      setSavedFilters(prev => prev.map(f => 
        f.id === id ? { ...f, name: editingFilterName.trim() } : f
      ));
      setEditingFilterId(null);
      setEditingFilterName('');
    } catch (err) {
      console.error('Failed to rename filter:', err);
    }
  };

  const deleteFilter = async (id: number) => {
    if (!confirm('Delete this saved filter?')) return;
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      setSavedFilters(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error('Failed to delete filter:', err);
    }
  };

  const formatFilterSummary = (filter: SavedFilter): string => {
    let f: FilterConfig;
    try {
      f = typeof filter.filters === 'string' ? JSON.parse(filter.filters) as FilterConfig : filter.filters;
    } catch {
      return 'Invalid filter data';
    }
    const parts: string[] = [];
    if (f.excludeCompanies?.length) parts.push(`Excludes: ${f.excludeCompanies.join(', ')}`);
    if (f.excludeTitleKeywords?.length) parts.push(`No keywords: ${f.excludeTitleKeywords.join(', ')}`);
    if ((f.minScore ?? 0) > 0) parts.push(`Min score: ${f.minScore}`);
    if (f.remoteOnly) parts.push('Remote only');
    if (f.datePosted) parts.push(`Last ${f.datePosted} days`);
    if (f.postedBy) parts.push(`Company: ${f.postedBy}`);
    if (f.rateMin || f.rateMax) parts.push(`Rate: £${f.rateMin || '0'}-${f.rateMax || '∞'}/day`);
    if (f.skillsFilter) parts.push(`Skills: ${f.skillsFilter}`);
    if (f.locationFilter) parts.push(`Location: ${f.locationFilter}`);
    if (f.remotePref) parts.push(`Remote: ${f.remotePref}`);
    if (f.contractLengthFilter) parts.push(`Length: ${f.contractLengthFilter}`);
    return parts.length > 0 ? parts.join(' · ') : 'No filters set';
  };

  const toggleFinder = async () => {
    setToggling(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_finder_enabled: !finderEnabled }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const data = await res.json();
      setFinderEnabled(Boolean(data.profile.contract_finder_enabled));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle');
    } finally {
      setToggling(false);
    }
  };

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
          skills: skillTags.length > 0 ? skillTags.join(', ') : null,
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

      {/* Contract Finder Toggle */}
      <div style={toggleCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Contract Finder
            </h2>
            <p style={{ fontSize: '0.85rem', color: finderEnabled ? '#16a34a' : '#6b7280', margin: 0 }}>
              {finderEnabled
                ? 'Actively matching you with contracts'
                : 'Paused — enable to receive matches'}
            </p>
          </div>
          <button
            onClick={toggleFinder}
            disabled={toggling}
            style={{
              ...toggleBtnStyle,
              background: finderEnabled ? '#16a34a' : '#d1d5db',
            }}
          >
            <span
              style={{
                ...toggleKnobStyle,
                transform: finderEnabled ? 'translateX(24px)' : 'translateX(0)',
              }}
            />
          </button>
        </div>
      </div>

      {error && <div style={errorStyle}>{error}</div>}
      {success && (
        <div style={successStyle}>
          Profile saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle} htmlFor="skillInput">Skills</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              id="skillInput"
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const val = skillInput.trim().toLowerCase();
                  if (val && !skillTags.includes(val)) {
                    setSkillTags(prev => [...prev, val]);
                  }
                  setSkillInput('');
                }
              }}
              placeholder="Type a skill and press Enter"
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
            {skillTags.map((tag, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                  borderRadius: 4,
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setSkillTags(prev => prev.filter((_, idx) => idx !== i))}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#1d4ed8',
                    fontSize: '0.9rem',
                    lineHeight: 1,
                    padding: '0 0.125rem',
                    fontWeight: 700,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <p style={helpStyle}>Press Enter to add each skill</p>
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

      {/* Saved Filters Section */}
      <div style={{ marginTop: '2rem', borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Saved Filters</h2>

        {savedFilters.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            No saved filters yet. Save a filter from the Dashboard to see it here.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {savedFilters.map((filter) => (
              <div
                key={filter.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '1rem',
                  background: Boolean(filter.is_active) ? 'white' : '#f9fafb',
                  opacity: Boolean(filter.is_active) ? 1 : 0.7,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  {editingFilterId === filter.id ? (
                    <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                      <input
                        value={editingFilterName}
                        onChange={(e) => setEditingFilterName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') renameFilter(filter.id); if (e.key === 'Escape') { setEditingFilterId(null); setEditingFilterName(''); } }}
                        style={{ ...inputStyle, padding: '0.375rem 0.5rem', fontSize: '0.8rem', flex: 1 }}
                        autoFocus
                      />
                      <button
                        onClick={() => renameFilter(filter.id)}
                        style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 4, padding: '0.25rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingFilterId(null); setEditingFilterName(''); }}
                        style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 4, padding: '0.25rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer', color: '#6b7280' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{filter.name}</span>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 500,
                        padding: '0.125rem 0.375rem',
                        borderRadius: 8,
                        background: Boolean(filter.is_active) ? '#dcfce7' : '#f3f4f6',
                        color: Boolean(filter.is_active) ? '#166534' : '#6b7280',
                      }}>
                        {Boolean(filter.is_active) ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  )}
                  
                  {editingFilterId !== filter.id && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => { setEditingFilterId(filter.id); setEditingFilterName(filter.name); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#2563eb', fontWeight: 500 }}
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => toggleFilterActive(filter)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#d97706', fontWeight: 500 }}
                      >
                        {Boolean(filter.is_active) ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => deleteFilter(filter.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#ef4444', fontWeight: 500 }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 }}>
                  {formatFilterSummary(filter)}
                </p>
              </div>
            ))}
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

const toggleCardStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '1.5rem',
  marginBottom: '1.5rem',
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
