'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function HomePage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'authenticated') {
      const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
      if (isAdmin) {
        window.location.href = '/admin';
      } else {
        window.location.href = '/dashboard';
      }
    } else {
      window.location.href = '/login';
    }
  }, [status, session]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-geist-sans)' }}>
      Redirecting...
    </div>
  );
}
