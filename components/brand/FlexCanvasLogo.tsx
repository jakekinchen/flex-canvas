import Link from "next/link";

export function FlexCanvasLogo({ className }: { className?: string }) {
  const classes = ["flex-canvas-logo", className].filter(Boolean).join(" ");

  return (
    <Link className={classes} href="/" aria-label="Flex Canvas home">
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-triangle" />
        <span className="brand-dot" />
        <span className="brand-square" />
      </span>
      <span>
        Flex
        <br />
        Canvas
      </span>
    </Link>
  );
}
