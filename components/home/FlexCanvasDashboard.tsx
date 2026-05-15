import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Grid2X2,
  Home,
  Menu,
  Plus,
  Users,
} from "lucide-react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { BoardCardMenu } from "@/components/board/BoardRenameControls";
import { FlexCanvasLogo } from "@/components/brand/FlexCanvasLogo";
import { exampleBoardTemplates, type ExampleBoardTemplate } from "@/lib/boards/examples";
import type { FlexRecentBoard } from "@/lib/boards/presentation";

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

const navItems = [
  { id: "home", label: "Home", icon: Home, href: "/" },
  { id: "boards", label: "Boards", icon: Grid2X2, href: "/boards" },
];

export function FlexCanvasDashboard({ activeView = "home", account, boards = [], canCreate = false, setupWarning }: FlexCanvasDashboardProps) {
  const currentView = activeView;
  const profile = account ?? {
    detail: "Save boards",
    isAuthenticated: false,
    name: "Signed out",
  };
  const isBoardsView = currentView === "boards";
  const showStarterTemplates = !isBoardsView && boards.length === 0;
  const visibleBoards = boards.length ? boards.slice(0, isBoardsView ? boards.length : 3) : [];
  const boardsHref = canCreate ? "/boards" : "/login?next=/boards";
  const primaryLabel = canCreate ? (isBoardsView ? "New board" : "Start board") : "Sign in to start";
  const secondaryHref = isBoardsView ? "/" : profile.isAuthenticated ? "/boards" : "#boards";
  const secondaryLabel = isBoardsView ? "Go home" : profile.isAuthenticated ? "Go to boards" : "View starter boards";
  const sectionTitle = isBoardsView ? "Your boards" : visibleBoards.length ? "Recent boards" : "Starter boards";
  const emptyTitle = isBoardsView ? "No boards yet" : "No recent boards yet";
  const emptyDetail = isBoardsView ? "New boards will appear here." : "Recent boards will appear here.";

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
          <FlexCanvasLogo />
          {profile.isAuthenticated ? (
            <SignOutButton />
          ) : (
            <Link className="mobile-topbar-action" href={boardsHref} aria-label="Sign in to open boards">
              <Menu size={26} />
            </Link>
          )}
        </header>

        <section className="reference-hero-panel">
          <div className="reference-copy">
            <p className="reference-kicker">{isBoardsView ? "Board library" : "Realtime whiteboard"}</p>
            <h1>{isBoardsView ? "Your boards" : "Flex Canvas"}</h1>
            <div className="blue-squiggle" aria-hidden="true" />
            <p className="reference-description">
              {isBoardsView
                ? "Saved collaborative boards and active canvas sessions."
                : "A collaborative canvas for planning boards, workshops, and AI-assisted layouts."}
            </p>
            <div className="reference-actions">
              {canCreate ? (
                <form action="/boards/new" method="post" className="reference-action-form">
                  <input className="reference-board-name" name="name" placeholder="Board name" defaultValue="Untitled board" />
                  <button className="reference-primary-action" type="submit" aria-label="Create board">
                    <Plus size={19} />
                    {primaryLabel}
                    <ArrowRight size={22} />
                  </button>
                </form>
              ) : (
                <Link className="reference-primary-action" href="/login?next=/boards">
                  <Plus size={19} />
                  {primaryLabel}
                  <ArrowRight size={22} />
                </Link>
              )}
              <Link className="reference-secondary-action" href={secondaryHref}>
                {secondaryLabel}
                {isBoardsView ? <Home size={18} /> : profile.isAuthenticated ? <Grid2X2 size={18} /> : <ArrowRight size={18} />}
              </Link>
            </div>
          </div>
          <ReferenceCanvasPreview />
        </section>

        {setupWarning}

        <section className="recent-boards-section" id="boards">
          <div className="board-section-header">
            <h2>{sectionTitle}</h2>
            {profile.isAuthenticated ? <span>{boards.length} {boards.length === 1 ? "board" : "boards"}</span> : null}
          </div>
          {visibleBoards.length ? (
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
                  <small>Sign in to create</small>
                </Link>
              )}
            </div>
          ) : showStarterTemplates ? (
            <div className="reference-board-grid">
              {exampleBoardTemplates.map((template) => (
                <StarterBoardCard canCreate={canCreate} key={template.id} template={template} />
              ))}
            </div>
          ) : (
            <div className="boards-empty-state">
              <strong>{emptyTitle}</strong>
              <p>{emptyDetail}</p>
              {canCreate ? (
                <form action="/boards/new" method="post">
                  <input name="name" type="hidden" value="Untitled board" />
                  <button className="reference-primary-action" type="submit" aria-label="Create board">
                    <Plus size={19} />
                    New board
                    <ArrowRight size={22} />
                  </button>
                </form>
              ) : (
                <Link className="reference-primary-action" href="/login?next=/boards">
                  <Plus size={19} />
                  Sign in to start
                  <ArrowRight size={22} />
                </Link>
              )}
            </div>
          )}
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

function StarterBoardCard({
  canCreate,
  template,
}: {
  canCreate: boolean;
  template: ExampleBoardTemplate;
}) {
  const content = <StarterBoardCardContent canCreate={canCreate} template={template} />;

  if (!canCreate) {
    return (
      <Link className="starter-board-card" href="/login?next=/boards" title={template.description}>
        {content}
      </Link>
    );
  }

  return (
    <form action="/boards/new" method="post" className="starter-board-card" title={template.description}>
      <input name="template" type="hidden" value={template.id} />
      <input name="name" type="hidden" value={template.name} />
      <button type="submit" aria-label={`Create ${template.name} board`}>
        {content}
      </button>
    </form>
  );
}

function StarterBoardCardContent({ canCreate, template }: { canCreate: boolean; template: ExampleBoardTemplate }) {
  return (
    <span className="starter-card-body">
      <span className="starter-card-icon" aria-hidden="true">
        <Plus size={24} />
      </span>
      <strong>{template.name}</strong>
      <small>{template.description}</small>
      <em>{canCreate ? "Create starter" : "Sign in to create"}</em>
    </span>
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
    <article className="reference-board-card">
      <Link className="reference-board-card-link" href={board.href}>
        {content}
      </Link>
      <BoardCardMenu boardId={board.id} initialName={board.name} />
    </article>
  ) : (
    <article className="reference-board-card">{content}</article>
  );
}
