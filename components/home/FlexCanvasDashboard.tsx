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
import { SignOutButton } from "@/components/auth/SignOutButton";
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
  account?: {
    detail: string;
    isAuthenticated: boolean;
    name: string;
  };
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

export function FlexCanvasDashboard({ activeView = "home", account, boards = [], canCreate = false, setupWarning }: FlexCanvasDashboardProps) {
  const currentView = activeView;
  const visibleBoards = boards.length ? boards.slice(0, 3) : sampleBoards;
  const boardsHref = canCreate ? "/boards" : "/login?next=/boards";
  const primaryHref = canCreate ? "/boards" : "/login?next=/boards";
  const secondaryHref = currentView === "boards" ? "#recent" : boardsHref;
  const secondaryLabel = currentView === "boards" ? "View boards" : "Open boards";
  const profile = account ?? {
    detail: "Sign in to save boards",
    isAuthenticated: false,
    name: "Signed out",
  };

  return (
    <main className="reference-shell">
      <aside className="reference-sidebar" aria-label="Primary">
        <FlexCanvasLogo />
        <nav className="reference-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const href = item.id === "boards" ? boardsHref : item.href;
            const isActive = item.id === currentView;
            return (
              <Link aria-current={isActive ? "page" : undefined} className={isActive ? "active" : ""} href={href} key={item.label}>
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
            <strong>{profile.name}</strong>
            <small>{profile.detail}</small>
          </span>
          {profile.isAuthenticated ? (
            <SignOutButton />
          ) : (
            <Link className="profile-sign-in" href="/login?next=/boards">
              Sign in
            </Link>
          )}
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
          <Link className="mobile-topbar-action" href={boardsHref} aria-label={canCreate ? "Open boards" : "Sign in to open boards"}>
            <Menu size={26} />
          </Link>
        </header>

        <section className="reference-hero-panel">
          <div className="reference-copy">
            <p className="reference-kicker">{currentView === "boards" ? "Your workspace" : "Realtime whiteboard"}</p>
            <h1>{currentView === "boards" ? "Boards" : "Flex Canvas"}</h1>
            <div className="blue-squiggle" aria-hidden="true" />
            <p className="reference-description">
              {currentView === "boards"
                ? "Create a new collaborative canvas, reopen an existing board, or sign out when you want to return to the login screen."
                : "Authenticated collaborative canvas with React Konva rendering, Liveblocks custom Storage, multiplayer presence, and server-applied AI board operations."}
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
                <Link className="reference-primary-action" href={primaryHref}>
                  <Plus size={19} />
                  Start board
                  <ArrowRight size={22} />
                </Link>
              )}
              <Link className="reference-secondary-action" href={secondaryHref}>
                {secondaryLabel}
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
              <Link className="new-board-card" href="/login?next=/boards">
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
          <Link className="dock-create" href={canCreate ? "/boards" : "/login?next=/boards"}>
            <Plus size={22} />
          </Link>
          <Link className={currentView === "boards" ? "active" : ""} href={boardsHref}>
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
