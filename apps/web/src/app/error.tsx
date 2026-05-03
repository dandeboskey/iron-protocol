"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Top-level App Router error boundary. Catches render-time errors and
 * post-mount throws from any page. Without this, Next.js falls back to its
 * default "Application error" stack trace screen, which is unstyled and
 * gives the user no escape.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary:", error);
  }, [error]);

  return (
    <div className="card text-center py-12 space-y-4">
      <h2 className="text-2xl font-bold text-iron-100">Something broke.</h2>
      <p className="text-sm text-iron-400">
        {error.message || "An unexpected error occurred."}
        {error.digest && (
          <span className="block mt-1 text-xs text-iron-600 font-mono">id: {error.digest}</span>
        )}
      </p>
      <div className="flex gap-3 justify-center">
        <button onClick={reset} className="btn-primary">Try again</button>
        <Link href="/" className="btn-secondary">Dashboard</Link>
      </div>
    </div>
  );
}
