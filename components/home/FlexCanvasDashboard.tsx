import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Copy,
  Grid2X2,
  Home,
  Menu,
  Plus,
  Users,
} from "lucide-react";
import { FlexCanvasLogo } from "@/components/brand/FlexCanvasLogo";

export type FlexRecentBoard = {
  collaborators?: number;
  href?: string;
  id: string;
  name: string;
  updatedLabel: string;
};

type FlexCanvasDashboardProps = {
  activeView?: "home" | "boards";
  boards?: FlexRecentBoard[];
  canCreate?: boolean;
  setupWarning?: ReactNode;
};

const sampleBoards: FlexRecentBoard[] = [
  { id: "sample-q2", name: "Q2 Planning", updatedLabel: "Edited 2h ago", collaborators: 4 },
  { id: "sample-user", name: "User Research", updatedLabel: "Edited 1d ago", collaborators: 3 },
  { id: "sample-design", name: "Design Critique", updatedLabel: "Edited 3d ago", collaborators: 5 },
];

const navItems = [
  { id: "home", label: "Home", icon: Home, href: "/" },
  { id: "boards", label: "Boards", icon: Grid2X2, href: "/boards" },
];

export function FlexCanvasDashboard({ activeView, boards = [], canCreate = false, setupWarning }: FlexCanvasDashboardProps) {
  const currentView = activeView ?? (canCreate ? "boards" : "home");
  const visibleBoards = boards.length ? boards.slice(0, 3) : sampleBoards;

  return (
    <main className="reference-shell">
      <aside className="reference-sidebar" aria-label="Primary">
        <FlexCanvasLogo />
        <nav className="reference-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link className={item.id === currentView ? "active" : ""} href={item.href} key={item.label}>
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-art" aria-hidden="true" />
        <div className="sidebar-lines" aria-hidden="true" />
        <div className="profile-card">
          <span className="profile-avatar" />
          <span>
            <strong>Jordan Lee</strong>
            <small>jordan@flux.dev</small>
          </span>
          <span aria-hidden="true">⌄</span>
        </div>
      </aside>

      <section className="reference-workspace">
        <header className="mobile-app-topbar">
          <div className="mobile-statusbar" aria-hidden="true">
            <span>9:41</span>
            <span className="status-icons">
              <span />
              <span />
              <span />
            </span>
          </div>
          <FlexCanvasLogo />
          <button type="button" aria-label="Open menu">
            <Menu size={26} />
          </button>
        </header>

        <section className="reference-hero-panel">
          <div className="reference-copy">
            <p className="reference-kicker">Realtime whiteboard</p>
            <h1>Flex Canvas</h1>
            <div className="blue-squiggle" aria-hidden="true" />
            <p className="reference-description">
              Authenticated collaborative canvas with React Konva rendering, Liveblocks custom Storage,
              multiplayer presence, and server-applied AI board operations.
            </p>
            <div className="reference-actions">
              {canCreate ? (
                <form action="/boards/new" method="post" className="reference-action-form">
                  <input className="reference-board-name" name="name" placeholder="Board name" defaultValue="Untitled board" />
                  <button className="reference-primary-action" type="submit" aria-label="Create board">
                    <Plus size={19} />
                    Start board
                    <ArrowRight size={22} />
                  </button>
                </form>
              ) : (
                <Link className="reference-primary-action" href="/login">
                  <Plus size={19} />
                  Start board
                  <ArrowRight size={22} />
                </Link>
              )}
              <Link className="reference-secondary-action" href="/boards">
                Open boards
                <Copy size={18} />
              </Link>
            </div>
          </div>
          <ReferenceCanvasPreview />
        </section>

        {setupWarning}

        <section className="recent-boards-section" id="recent">
          <h2>Recent boards</h2>
          <div className="reference-board-grid">
            {visibleBoards.map((board, index) => (
              <RecentBoardCard board={board} index={index} key={board.id} />
            ))}
            {canCreate ? (
              <form action="/boards/new" method="post" className="new-board-card">
                <input name="name" type="hidden" value="Untitled board" />
                <button type="submit" aria-label="Create board">
                  <span aria-hidden="true">+</span>
                  <small>New board</small>
                </button>
              </form>
            ) : (
              <Link className="new-board-card" href="/login">
                <span aria-hidden="true">+</span>
                <small>New board</small>
              </Link>
            )}
          </div>
        </section>

        <nav className="mobile-dock" aria-label="Mobile navigation">
          <Link className={currentView === "home" ? "active" : ""} href="/">
            <Home size={24} />
          </Link>
          <Link className="dock-create" href={canCreate ? "/boards" : "/login"}>
            <Plus size={22} />
          </Link>
          <Link className={currentView === "boards" ? "active" : ""} href="/boards">
            <Grid2X2 size={24} />
          </Link>
        </nav>
      </section>
    </main>
  );
}

function ReferenceCanvasPreview() {
  return (
    <div className="reference-canvas" aria-hidden="true">
      <div className="pink-texture" />
      <div className="blue-disc" />
      <div className="pink-corner" />
      <div className="canvas-grid" />
      <div className="preview-note note-yellow">User Research</div>
      <div className="preview-note note-pink">
        Pain Points
        <span>•••</span>
      </div>
      <div className="preview-note note-green">Actions</div>
      <div className="preview-frame">
        <strong>SWOT</strong>
        <span>✳</span>
      </div>
      <div className="cursor-arrow" />
      <div className="bottom-squiggle" />
    </div>
  );
}

function RecentBoardCard({ board, index }: { board: FlexRecentBoard; index: number }) {
  const content = (
    <>
      <div className={`card-art card-art-${index % 3}`}>
        <span className="art-pink" />
        <span className="art-yellow" />
        <span className="art-blue" />
        <span className="art-green" />
        <span className="art-arc" />
        <span className="art-line" />
      </div>
      <div className="card-meta">
        <strong>{board.name}</strong>
        <span>{board.updatedLabel}</span>
        <small>
          <Users size={13} />
          {board.collaborators ?? 1}
        </small>
      </div>
    </>
  );

  return board.href ? (
    <Link className="reference-board-card" href={board.href}>
      {content}
    </Link>
  ) : (
    <article className="reference-board-card">{content}</article>
  );
}
