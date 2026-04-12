import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#07080f] px-6 text-center">
      <p className="font-orbitron text-[10px] tracking-[0.25em] text-violet-400/80 uppercase">404</p>
      <h1 className="mt-3 font-orbitron text-2xl font-bold text-white">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        This path does not exist in {SITE_NAME}. Head back to the map to run a simulation.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-xl border border-violet-500/40 bg-violet-500/10 px-6 py-3 font-orbitron text-xs font-semibold tracking-wide text-violet-200 transition hover:bg-violet-500/20"
      >
        Back to simulator
      </Link>
    </div>
  );
}
