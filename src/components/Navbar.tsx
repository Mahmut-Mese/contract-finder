'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { data: session, status } = useSession();
  const isAuth = status === 'authenticated';
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuth) return;

    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/notifications?unread_only=true&limit=1');
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // Silently ignore — notification badge is non-critical
      }
    };

    fetchUnread();
    // Poll every 60 seconds for new notifications
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, [isAuth]);

  return (
    <nav style={navStyle}>
      <a href="/" style={{ ...brandStyle, textDecoration: 'none' }}>
        Contract Finder
      </a>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {isAuth ? (
          <>
            <a href="/dashboard" style={navLinkStyle}>Dashboard</a>
            <a href="/profile" style={navLinkStyle}>Profile</a>
            <a href="/applications" style={navLinkStyle}>Applications</a>
            <a href="/history" style={navLinkStyle}>History</a>
            <a href="/notifications" style={{ ...navLinkStyle, position: 'relative' }}>
              Notifications
              {unreadCount > 0 && (
                <span style={badgeStyle}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </a>
            {(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin && (
              <a href="/admin" style={navLinkStyle}>Admin</a>
            )}
            <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{session?.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              style={signOutStyle}
            >
              Sign Out
            </button>
          </>
        ) : (
          <a href="/login" style={navLinkStyle}>Sign In</a>
        )}
      </div>
    </nav>
  );
}

const navStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.75rem 1.5rem',
  borderBottom: '1px solid #e5e7eb',
  background: 'white',
  fontFamily: 'var(--font-geist-sans)',
};

const brandStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: '1rem',
  color: '#111827',
};

const navLinkStyle: React.CSSProperties = {
  color: '#374151',
  textDecoration: 'none',
  fontWeight: 500,
  fontSize: '0.875rem',
};

const signOutStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  padding: '0.375rem 0.75rem',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: 500,
  color: '#374151',
};

const badgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: -8,
  right: -12,
  background: '#ef4444',
  color: 'white',
  borderRadius: 10,
  padding: '0 5px',
  fontSize: '0.65rem',
  fontWeight: 700,
  minWidth: 16,
  height: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
};
