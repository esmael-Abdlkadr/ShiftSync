'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[Dashboard Error]', error);
  }, [error]);

  return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 max-w-md w-full text-center">
        <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-500 mb-6">
          {error.message && error.message !== 'An error occurred in the Server Components render.'
            ? error.message
            : 'An unexpected error occurred. This may be a temporary issue — please try again.'}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
