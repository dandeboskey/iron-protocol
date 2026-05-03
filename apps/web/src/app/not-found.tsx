import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card text-center py-12 space-y-4">
      <h2 className="text-2xl font-bold text-iron-100">Page not found.</h2>
      <p className="text-sm text-iron-400">That route doesn&apos;t exist in Iron Protocol.</p>
      <Link href="/" className="btn-primary inline-block">Back to Dashboard</Link>
    </div>
  );
}
