'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Caught by error boundary:', error);
  }, [error]);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Something went wrong!</h2>
      <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '1rem', borderRadius: 8, textAlign: 'left', marginBottom: '1.5rem', overflowX: 'auto' }}>
        <strong style={{ color: '#991b1b' }}>Error message:</strong>
        <pre style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap', color: '#7f1d1d' }}>
          {error.message || 'Unknown error'}
        </pre>
        {error.digest && (
          <p style={{ margin: '0.5rem 0 0', color: '#991b1b', fontSize: '0.8rem' }}>
            Digest: {error.digest}
          </p>
        )}
      </div>
      <button
        onClick={() => reset()}
        style={{
          background: '#2563eb',
          color: 'white',
          padding: '0.5rem 1rem',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontWeight: 600
        }}
      >
        Try again
      </button>
      <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#6b7280' }}>
        If this persists, please try a hard refresh (Cmd+Shift+R / Ctrl+F5) or check if your Node app was restarted in Hostinger.
      </p>
    </div>
  );
}
