import Link from "next/link";
import { ArrowRight, Grid2X2, Home } from "lucide-react";
import { FlexCanvasLogo } from "@/components/brand/FlexCanvasLogo";

export default function NotFound() {
  return (
    <main className="dashboard-shell">
      <section className="setup-warning">
        <FlexCanvasLogo />
        <p className="eyebrow">404</p>
        <h1>Board not found</h1>
        <p>The board may have moved, been deleted, or require access from a different account.</p>
        <div className="page-state-actions">
          <Link className="reference-primary-action" href="/boards">
            <Grid2X2 size={18} />
            Open boards
            <ArrowRight size={20} />
          </Link>
          <Link className="reference-secondary-action" href="/">
            <Home size={18} />
            Home
          </Link>
        </div>
      </section>
    </main>
  );
}
