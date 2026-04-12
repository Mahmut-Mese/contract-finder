'use client';

import { useState, useEffect, useCallback } from 'react';

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean | number;
  created_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=50');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (notificationId: number) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-geist-sans)' }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem', fontFamily: 'var(--font-geist-sans)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
          Notifications
          {unreadCount > 0 && (
            <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 400, marginLeft: '0.5rem' }}>
              ({unreadCount} unread)
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={markAllBtnStyle}>
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
            No notifications yet. You&apos;ll see updates here when new contract matches are found.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {notifications.map((n) => {
            const isUnread = !Boolean(n.is_read);
            return (
              <div
                key={n.id}
                style={{
                  ...cardStyle,
                  background: isUnread ? '#f0f9ff' : 'white',
                  cursor: isUnread ? 'pointer' : 'default',
                  borderLeft: isUnread ? '3px solid #2563eb' : '3px solid transparent',
                }}
                onClick={() => {
                  if (isUnread) markAsRead(n.id);
                  if (n.link) window.location.href = n.link;
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: isUnread ? 600 : 400 }}>
                      {n.title}
                    </h3>
                    {n.body && (
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                        {n.body}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#d1d5db', flexShrink: 0, marginLeft: '1rem' }}>
                    {formatTimeAgo(n.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '1rem',
};

const markAllBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  padding: '0.375rem 0.75rem',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: 500,
  color: '#2563eb',
};
