"use client";

import Link from "next/link";
import { Home, RotateCcw } from "lucide-react";
import { FlexCanvasLogo } from "@/components/brand/FlexCanvasLogo";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="dashboard-shell">
      <section className="setup-warning">
        <FlexCanvasLogo />
        <p className="eyebrow">Error</p>
        <h1>Canvas could not load</h1>
        <p>Try reloading the page. If this keeps happening, return home and reopen the board.</p>
        <div className="page-state-actions">
          <button type="button" onClick={reset}>
            <RotateCcw size={18} />
            Try again
          </button>
          <Link className="reference-secondary-action" href="/">
            <Home size={18} />
            Home
          </Link>
        </div>
      </section>
    </main>
  );
}
