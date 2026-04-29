'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface Profile {
  skills: string | null;
  min_rate: number | null;
  max_rate: number | null;
  location: string | null;
  remote_preference: string | null;
  contract_length: string | null;
  search_fingerprint: string | null;
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
  match_log_id: number | null;
  run_started_at: string | null;
}

interface SavedSearch {
  id: number;
  name: string;
  is_active: boolean;
  filters: {
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
  };
}

function formatRunDate(dateString: string | null) {
  if (!dateString) return 'Unknown run';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'Unknown run';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate().toString().padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<MatchedJob[]>([]);
  const [matchTotal, setMatchTotal] = useState(0);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchFilter, setMatchFilter] = useState<string>('mylist'); // 'mylist' = default tab
  const [page, setPage] = useState(0); // 0-indexed page number
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  // Cache full descriptions by job_id — persists across loadMatches re-renders
  const [fullDescriptions, setFullDescriptions] = useState<Map<number, string>>(new Map());
  
  // Existing filter state
  const [excludeCompanies, setExcludeCompanies] = useState<string[]>([]);
  const [excludeTitleKeywords, setExcludeTitleKeywords] = useState<string[]>([]);
  const [minScore, setMinScore] = useState<number>(0);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [companyInput, setCompanyInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [skillsFilterTags, setSkillsFilterTags] = useState<string[]>([]);
  const [skillsFilterInput, setSkillsFilterInput] = useState('');

  // New filter state (display values)
  const [datePosted, setDatePosted] = useState("");
  const [postedBy, setPostedBy] = useState("");
  const [rateMin, setRateMin] = useState("");
  const [rateMax, setRateMax] = useState("");
  // skillsFilter is now derived from skillsFilterTags
  const skillsFilter = skillsFilterTags.join(', ');
  const [locationFilter, setLocationFilter] = useState("");
  const [remotePref, setRemotePref] = useState("");
  const [contractLengthFilter, setContractLengthFilter] = useState("");

  // Debounced versions of text filters (used in API calls)
  const [debouncedPostedBy, setDebouncedPostedBy] = useState("");
  const [debouncedSkills, setDebouncedSkills] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");
  const [debouncedContractLength, setDebouncedContractLength] = useState("");
  const [debouncedRateMin, setDebouncedRateMin] = useState("");
  const [debouncedRateMax, setDebouncedRateMax] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Debounce text filter changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedPostedBy(postedBy);
      setDebouncedSkills(skillsFilter);
      setDebouncedLocation(locationFilter);
      setDebouncedContractLength(contractLengthFilter);
      setDebouncedRateMin(rateMin);
      setDebouncedRateMax(rateMax);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [postedBy, skillsFilter, locationFilter, contractLengthFilter, rateMin, rateMax]);
  
  // Reset page when debounced values change (new filter results should start at page 1)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPage(0);
  }, [debouncedPostedBy, debouncedSkills, debouncedLocation, debouncedContractLength, debouncedRateMin, debouncedRateMax]);
  
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [activeSearchId, setActiveSearchId] = useState<number | null>(null);
  const [searchName, setSearchName] = useState('');
  const [savingSearch, setSavingSearch] = useState(false);
  
  const PAGE_SIZE = 10;

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile');
      if (!res.ok) throw new Error('Failed to load profile');
      const data = await res.json();
      setProfile(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSavedSearches = useCallback(async () => {
    try {
      const res = await fetch('/api/saved-searches');
      if (!res.ok) return;
      const data = await res.json();
      setSavedSearches(data.searches || []);
    } catch {
      // non-critical
    }
  }, []);

  const applySavedSearch = (search: SavedSearch) => {
    setActiveSearchId(search.id);
    setSearchName(search.name);
    
    const f = search.filters;
    setExcludeCompanies(f.excludeCompanies || []);
    setExcludeTitleKeywords(f.excludeTitleKeywords || []);
    setMinScore(f.minScore || 0);
    setRemoteOnly(f.remoteOnly || false);
    
    setDatePosted(f.datePosted || "");
    setPostedBy(f.postedBy || "");
    setRateMin(f.rateMin || "");
    setRateMax(f.rateMax || "");
    setSkillsFilterTags(f.skillsFilter ? f.skillsFilter.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
    setLocationFilter(f.locationFilter || "");
    setRemotePref(f.remotePref || "");
    setContractLengthFilter(f.contractLengthFilter || "");
    
    setPage(0);
  };

  const saveCurrentFilters = async () => {
    const name = searchName.trim() || 'My Search';
    const filters = { 
      excludeCompanies, excludeTitleKeywords, minScore, remoteOnly,
      datePosted, postedBy, rateMin, rateMax, skillsFilter, locationFilter, remotePref, contractLengthFilter
    };
    setSavingSearch(true);
    try {
      if (activeSearchId) {
        // Update existing
        const res = await fetch('/api/saved-searches', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: activeSearchId, name, filters }),
        });
        if (!res.ok) throw new Error('Failed to update');
      } else {
        // Create new
        const res = await fetch('/api/saved-searches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, filters }),
        });
        if (!res.ok) throw new Error('Failed to save');
        const data = await res.json();
        setActiveSearchId(data.id);
      }
      await loadSavedSearches();
    } catch (err) {
      console.error('Failed to save search:', err);
    } finally {
      setSavingSearch(false);
    }
  };

  const deleteSavedSearch = async (id: number) => {
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      if (activeSearchId === id) {
        setActiveSearchId(null);
      }
      await loadSavedSearches();
    } catch (err) {
      console.error('Failed to delete search:', err);
    }
  };

  const loadMatches = useCallback(async () => {
    setMatchesLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      if (matchFilter) params.set('status', matchFilter);
      
      if (excludeCompanies.length > 0) params.set('exclude_companies', excludeCompanies.join(','));
      if (excludeTitleKeywords.length > 0) params.set('exclude_title_keywords', excludeTitleKeywords.join(','));
      if (minScore > 0) params.set('min_score', String(minScore));
      if (remoteOnly) params.set('remote_only', 'true');
      
      if (datePosted) params.set('date_posted', datePosted);
      if (debouncedPostedBy) params.set('posted_by', debouncedPostedBy);
      if (debouncedRateMin) params.set('rate_min', debouncedRateMin);
      if (debouncedRateMax) params.set('rate_max', debouncedRateMax);
      if (debouncedSkills) params.set('skills', debouncedSkills);
      if (debouncedLocation) params.set('location_filter', debouncedLocation);
      if (remotePref) params.set('remote_preference', remotePref);
      if (debouncedContractLength) params.set('contract_length', debouncedContractLength);
      
      const res = await fetch(`/api/matches?${params}`);
      if (!res.ok) throw new Error('Failed to load matches');
      const data = await res.json();
      setMatches(data.matches || []);
      setMatchTotal(data.total || 0);
      if (data.counts) setMatchCounts(data.counts);
    } catch (err) {
      console.error('Failed to load matches:', err);
    } finally {
      setMatchesLoading(false);
    }
  }, [matchFilter, page, excludeCompanies, excludeTitleKeywords, minScore, remoteOnly, datePosted, debouncedPostedBy, debouncedRateMin, debouncedRateMax, debouncedSkills, debouncedLocation, remotePref, debouncedContractLength]);

  useEffect(() => {
    loadProfile();
    loadSavedSearches();
  }, [loadProfile, loadSavedSearches]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const shouldShowInTab = (newStatus: string): boolean => {
    if (matchFilter === 'mylist') return newStatus === 'new' || newStatus === 'viewed';
    if (matchFilter === '') return newStatus !== 'dismissed' && newStatus !== 'deleted';
    return newStatus === matchFilter;
  };

  const updateMatchStatus = async (matchId: number, status: string) => {
    try {
      const oldMatch = matches.find(m => m.match_id === matchId);
      const oldStatus = oldMatch?.status;

      const res = await fetch('/api/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, status }),
      });
      if (!res.ok) throw new Error('Failed to update');
      
      // Optimistic count update
      if (oldStatus && oldStatus !== status) {
        setMatchCounts(prev => {
          const next = { ...prev };
          // Decrement old
          if (next[oldStatus] !== undefined) next[oldStatus] = Math.max(0, next[oldStatus] - 1);
          if (oldStatus === 'new' || oldStatus === 'viewed') next.mylist = Math.max(0, (next.mylist || 0) - 1);
          if (oldStatus !== 'dismissed' && oldStatus !== 'deleted') next.all = Math.max(0, (next.all || 0) - 1);

          // Increment new
          if (next[status] !== undefined) next[status] = (next[status] || 0) + 1;
          if (status === 'new' || status === 'viewed') next.mylist = (next.mylist || 0) + 1;
          if (status !== 'dismissed' && status !== 'deleted') next.all = (next.all || 0) + 1;

          return next;
        });
      }

      if (!shouldShowInTab(status)) {
        // Remove from view — new status doesn't belong in current tab
        setMatches((prev) => prev.filter((m) => m.match_id !== matchId));
        setMatchTotal((prev) => Math.max(0, prev - 1));
      } else {
        setMatches((prev) =>
          prev.map((m) => (m.match_id === matchId ? { ...m, status } : m))
        );
      }
    } catch (err) {
      console.error('Failed to update match:', err);
    }
  };

  const toggleExpand = (matchId: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  };

  const filterTabs = ['mylist', '', 'saved', 'applied', 'deleted'];

  const groupedMatches: { key: string, label: string, matches: MatchedJob[] }[] = [];
  const groupMap = new Map<string, MatchedJob[]>();
  const groupLabels = new Map<string, string>();

  matches.forEach(m => {
    const key = m.run_started_at || 'Unknown run';
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
      groupLabels.set(key, m.run_started_at ? formatRunDate(m.run_started_at) : 'Unknown run');
    }
    groupMap.get(key)!.push(m);
  });

  groupMap.forEach((mList, key) => {
    groupedMatches.push({
      key,
      label: groupLabels.get(key)!,
      matches: mList
    });
  });

  // Calculate active filter count
  let activeFilterCount = 0;
  if (excludeCompanies.length > 0) activeFilterCount++;
  if (excludeTitleKeywords.length > 0) activeFilterCount++;
  if (minScore > 0) activeFilterCount++;
  if (remoteOnly) activeFilterCount++;
  if (datePosted) activeFilterCount++;
  if (postedBy) activeFilterCount++;
  if (rateMin || rateMax) activeFilterCount++;
  if (skillsFilter) activeFilterCount++;
  if (locationFilter) activeFilterCount++;
  if (remotePref) activeFilterCount++;
  if (contractLengthFilter) activeFilterCount++;

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-geist-sans)' }}>Loading...</div>;
  }

  return (
    <div style={{ display: 'flex', gap: '1.5rem', padding: '2rem', fontFamily: 'var(--font-geist-sans)', maxWidth: 1200, margin: '0 auto' }}>
      
      {/* Left Sidebar - Filters */}
      <div style={{ width: 280, flexShrink: 0 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
              Filters
              {activeFilterCount > 0 && (
                <span style={{ color: '#2563eb', fontSize: '0.75rem', fontWeight: 600, marginLeft: '0.5rem', background: '#eff6ff', padding: '0.125rem 0.5rem', borderRadius: 10 }}>
                  {activeFilterCount}
                </span>
              )}
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Saved Searches */}
            <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
              <label style={filterLabelStyle}>Saved Searches</label>
              {savedSearches.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>No saved searches yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {savedSearches.map((s) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => applySavedSearch(s)}
                        style={{
                          ...actionBtnStyle,
                          color: activeSearchId === s.id ? '#2563eb' : '#374151',
                          fontWeight: activeSearchId === s.id ? 700 : 500,
                          fontSize: '0.8rem',
                          textAlign: 'left',
                          flex: 1
                        }}
                      >
                        {s.name}
                      </button>
                      <button
                        onClick={() => deleteSavedSearch(s.id)}
                        style={{ ...tagRemoveStyle, fontSize: '0.75rem' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date Posted */}
            <div>
              <label style={filterLabelStyle}>Date Posted</label>
              <select
                value={datePosted}
                onChange={(e) => { setDatePosted(e.target.value); setPage(0); }}
                style={filterInputStyle}
              >
                <option value="">Any time</option>
                <option value="1">Last 24 hours</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
              </select>
            </div>

            {/* Posted By */}
            <div>
              <label style={filterLabelStyle}>Posted By (Company)</label>
              <input
                value={postedBy}
                onChange={(e) => setPostedBy(e.target.value)}
                placeholder="e.g. Acme Corp"
                style={filterInputStyle}
              />
            </div>

            {/* Contract Rate */}
            <div>
              <label style={filterLabelStyle}>Contract Rate (£/day)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  value={rateMin}
                  onChange={(e) => setRateMin(e.target.value)}
                  placeholder="Min"
                  style={{ ...filterInputStyle, minWidth: 0 }}
                />
                <input
                  type="number"
                  value={rateMax}
                  onChange={(e) => setRateMax(e.target.value)}
                  placeholder="Max"
                  style={{ ...filterInputStyle, minWidth: 0 }}
                />
              </div>
            </div>

            {/* Skills */}
            <div>
              <label style={filterLabelStyle}>Skills</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  value={skillsFilterInput}
                  onChange={(e) => setSkillsFilterInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && skillsFilterInput.trim()) {
                      const val = skillsFilterInput.trim().toLowerCase();
                      if (!skillsFilterTags.includes(val)) {
                        setSkillsFilterTags(prev => [...prev, val]);
                      }
                      setSkillsFilterInput('');
                      setPage(0);
                    }
                  }}
                  placeholder="Type & press Enter"
                  style={filterInputStyle}
                />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
                {skillsFilterTags.map((s, i) => (
                  <span key={i} style={tagStyle}>
                    {s}
                    <button onClick={() => { setSkillsFilterTags(prev => prev.filter((_, idx) => idx !== i)); setPage(0); }}
                      style={tagRemoveStyle}>×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label style={filterLabelStyle}>Location</label>
              <input
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="e.g. London"
                style={filterInputStyle}
              />
            </div>

            {/* Remote Preference */}
            <div>
              <label style={filterLabelStyle}>Remote Preference</label>
              <select
                value={remotePref}
                onChange={(e) => { setRemotePref(e.target.value); setPage(0); }}
                style={filterInputStyle}
              >
                <option value="">Any</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>

            {/* Contract Length */}
            <div>
              <label style={filterLabelStyle}>Contract Length</label>
              <input
                value={contractLengthFilter}
                onChange={(e) => setContractLengthFilter(e.target.value)}
                placeholder="e.g. 6 months"
                style={filterInputStyle}
              />
            </div>

            {/* Exclude Companies */}
            <div>
              <label style={filterLabelStyle}>Exclude Companies</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && companyInput.trim()) {
                      setExcludeCompanies(prev => [...prev, companyInput.trim()]);
                      setCompanyInput('');
                      setPage(0);
                    }
                  }}
                  placeholder="Type & press Enter"
                  style={filterInputStyle}
                />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
                {excludeCompanies.map((c, i) => (
                  <span key={i} style={tagStyle}>
                    {c}
                    <button onClick={() => { setExcludeCompanies(prev => prev.filter((_, idx) => idx !== i)); setPage(0); }}
                      style={tagRemoveStyle}>×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Exclude Title Keywords */}
            <div>
              <label style={filterLabelStyle}>Exclude Title Keywords</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && keywordInput.trim()) {
                      setExcludeTitleKeywords(prev => [...prev, keywordInput.trim()]);
                      setKeywordInput('');
                      setPage(0);
                    }
                  }}
                  placeholder="Type & press Enter"
                  style={filterInputStyle}
                />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
                {excludeTitleKeywords.map((k, i) => (
                  <span key={i} style={tagStyle}>
                    {k}
                    <button onClick={() => { setExcludeTitleKeywords(prev => prev.filter((_, idx) => idx !== i)); setPage(0); }}
                      style={tagRemoveStyle}>×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Min Score */}
            <div>
              <label style={filterLabelStyle}>Minimum Score: {minScore}</label>
              <input
                type="range"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => { setMinScore(Number(e.target.value)); setPage(0); }}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setExcludeCompanies([]);
                  setExcludeTitleKeywords([]);
                  setMinScore(0);
                  setRemoteOnly(false);
                  setDatePosted("");
                  setPostedBy("");
                  setRateMin("");
                  setRateMax("");
                  setSkillsFilterTags([]);
                  setSkillsFilterInput('');
                  setLocationFilter("");
                  setRemotePref("");
                  setContractLengthFilter("");
                  setCompanyInput('');
                  setKeywordInput('');
                  setPage(0);
                  setActiveSearchId(null);
                }}
                style={{ ...actionBtnStyle, color: '#ef4444', fontSize: '0.8rem', textAlign: 'left', width: '100%' }}
              >
                Clear All Filters
              </button>
            )}

            {/* Save current filters */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder={activeSearchId ? 'Update name...' : 'Search name...'}
                style={{ ...filterInputStyle, width: '100%', boxSizing: 'border-box' }}
              />
              <button
                onClick={saveCurrentFilters}
                disabled={savingSearch}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: savingSearch ? 'default' : 'pointer',
                  opacity: savingSearch ? 0.6 : 1,
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {savingSearch ? 'Saving...' : activeSearchId ? 'Update Search' : 'Save Search'}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Right Main Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', marginTop: 0 }}>
          Dashboard
        </h1>

        {error && (
          <div style={errorStyle}>{error}</div>
        )}

        {/* Matched Jobs */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
              Matched Contracts {matchTotal > 0 && <span style={{ color: '#6b7280', fontWeight: 400 }}>({matchTotal})</span>}
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {filterTabs.map((f) => {
                const count = matchCounts[f === '' ? 'all' : f] || 0;
                return (
                  <button
                    key={f}
                    onClick={() => { setMatchFilter(f); setPage(0); }}
                    style={{
                      ...filterBtnStyle,
                      background: matchFilter === f ? '#2563eb' : 'white',
                      color: matchFilter === f ? 'white' : '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span>{f === '' ? 'All' : f === 'mylist' ? 'My List' : f.charAt(0).toUpperCase() + f.slice(1)}</span>
                    <span style={{
                      background: matchFilter === f ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
                      color: matchFilter === f ? 'white' : '#6b7280',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {matchesLoading ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '1rem' }}>Loading matches...</p>
          ) : matches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                {(profile?.skills?.length ?? 0) > 0
                  ? 'No matches yet. Adjust filters or wait for new contracts.'
                  : 'Complete your profile to start receiving matches.'}
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {groupedMatches.map((group) => (
                  <div key={group.key}>
                    <h3 style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#6b7280',
                      padding: '0.75rem 0 0.25rem',
                      borderBottom: '1px solid #e5e7eb',
                      marginBottom: '0.5rem',
                      marginTop: 0
                    }}>
                      {group.label}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {group.matches.map((match) => (
                        <MatchCard
                          key={match.match_id}
                          match={match}
                          isExpanded={expandedIds.has(match.match_id)}
                          onToggleExpand={() => toggleExpand(match.match_id)}
                          onStatusChange={updateMatchStatus}
                          fullDescription={fullDescriptions.get(match.job_id) ?? null}
                          onFullDescriptionLoaded={(jobId, desc) =>
                            setFullDescriptions(prev => new Map(prev).set(jobId, desc))
                          }
                        />
                      ))}
                    </div>
                  </div>
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
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', marginTop: 0 }}>Account</h2>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
            Signed in as <strong>{session?.user?.email}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Components ──

function MatchCard({
  match,
  isExpanded,
  onToggleExpand,
  onStatusChange,
  fullDescription,
  onFullDescriptionLoaded,
}: {
  match: MatchedJob;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (matchId: number, status: string) => void;
  fullDescription: string | null;
  onFullDescriptionLoaded: (jobId: number, desc: string) => void;
}) {
  const [descLoading, setDescLoading] = useState(false);
  // Stable ref so the callback doesn't cause the effect to re-fire on every render
  const onLoadedRef = useRef(onFullDescriptionLoaded);
  useEffect(() => { onLoadedRef.current = onFullDescriptionLoaded; });

  useEffect(() => {
    // Only fetch if expanded and we don't already have the full description
    if (!isExpanded || fullDescription !== null) return;
    setDescLoading(true);
    fetch(`/api/jobs/${match.job_id}/description`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.description) onLoadedRef.current(match.job_id, data.description);
      })
      .catch(() => {})
      .finally(() => setDescLoading(false));
  }, [isExpanded, fullDescription, match.job_id]);

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
        background: match.status === 'new' ? '#f0f9ff' : 'white',
        borderLeft: `4px solid ${scoreColor}`,
        overflow: 'hidden'
      }}
    >
      <div style={{ padding: '1rem' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>
            <span
              onClick={onToggleExpand}
              style={{
                color: '#9ca3af',
                marginRight: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.8rem',
                marginTop: '0.1rem',
                display: 'inline-block',
                transform: isExpanded ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.1s'
              }}
            >
              ▶
            </span>
            <div>
              <h3 
                style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}
                onClick={onToggleExpand}
              >
                {match.title}
              </h3>
              <p style={{ margin: '0.125rem 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                {match.company || 'Unknown company'}
                {match.location ? ` · ${match.location}` : ''}
                {salaryDisplay ? ` · ${salaryDisplay}` : ''}
              </p>
            </div>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem', marginLeft: '1.5rem' }}>
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
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginLeft: '1.5rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={match.status === 'applied'}
              onChange={(e) => {
                onStatusChange(match.match_id, e.target.checked ? 'applied' : 'new');
              }}
            />
            Applied
          </label>

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
            onClick={() => onStatusChange(match.match_id, 'deleted')}
            style={{ ...actionBtnStyle, color: '#ef4444' }}
          >
            Remove
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
      
      {/* Expanded details */}
      {isExpanded && (
        <div style={{
          background: '#f9fafb',
          padding: '1rem',
          borderTop: '1px solid #e5e7eb',
          fontSize: '0.85rem',
          color: '#374151',
          lineHeight: 1.6
        }}>
          {match.posted_at && (
            <div style={{ marginBottom: '0.75rem' }}>
              <strong>Posted:</strong> {new Date(match.posted_at).toLocaleString()}
            </div>
          )}
          {descLoading ? (
            <p style={{ color: '#9ca3af', margin: 0 }}>Loading full description…</p>
          ) : (
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {fullDescription || match.description || 'No description available.'}
            </div>
          )}
        </div>
      )}
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

const filterLabelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '0.375rem',
  display: 'block',
};

const filterInputStyle: React.CSSProperties = {
  flex: 1,
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.375rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: '0.8rem',
  outline: 'none',
};

const tagStyle: React.CSSProperties = {
  background: '#fef2f2',
  color: '#991b1b',
  padding: '0.125rem 0.5rem',
  borderRadius: 12,
  fontSize: '0.7rem',
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.25rem',
};

const tagRemoveStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#991b1b',
  fontSize: '0.85rem',
  fontWeight: 700,
  padding: 0,
  lineHeight: 1,
};
