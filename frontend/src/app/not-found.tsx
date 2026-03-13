import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-2xl bg-slate-900 flex items-center justify-center">
            <FileQuestion className="h-10 w-10 text-white" />
          </div>
        </div>

        <p className="text-7xl font-bold text-slate-900 tracking-tight mb-2">404</p>
        <h1 className="text-2xl font-semibold text-slate-800 mb-3">Page not found</h1>
        <p className="text-slate-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
