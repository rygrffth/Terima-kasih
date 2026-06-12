"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SupervisorRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/supervisor/pending');
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-xs text-theme-dim font-semibold animate-pulse">
      Mengalihkan ke halaman Antrean Audit...
    </div>
  );
}
