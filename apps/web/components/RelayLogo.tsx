/**
 * RelayLogo — Relay brand mark component.
 *
 * Uses CSS custom properties (--relay-box-bg / --relay-box-fg) driven by the
 * data-theme attribute on <html>, so the server and client render identical
 * HTML — no hydration mismatch, no useTheme() needed.
 *
 * Variants:
 *   "mark"      — SVG diamond only, uses currentColor (inherit from parent)
 *   "box"       — diamond inside a rounded square (default)
 *   "wordmark"  — box + "Relay" text side by side
 */

interface RelayLogoProps {
  variant?: "mark" | "box" | "wordmark";
  /** Height of the box (or mark diameter). Text size scales proportionally. Default 32. */
  size?: number;
}

/** SVG paths for the ◈ diamond mark — outer frame + inner solid diamond. */
function DiamondMark({ size, color = "currentColor" }: { size: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ display: "block", flexShrink: 0 }}
    >
      <path d="M12 2 L22 12 L12 22 L2 12 Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 8 L16 12 L12 16 L8 12 Z" fill={color} />
    </svg>
  );
}

export function RelayLogo({ variant = "box", size = 32 }: RelayLogoProps) {
  if (variant === "mark") {
    return (
      <span style={{ display: "inline-flex", flexShrink: 0, color: "inherit" }}>
        <DiamondMark size={size} />
      </span>
    );
  }

  const radius = Math.round(size * 0.25);

  const box = (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        // CSS vars resolve from data-theme on <html> — same value on server + client
        backgroundColor: "var(--relay-box-bg)",
        color: "var(--relay-box-fg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {/* currentColor inherits --relay-box-fg from the div above */}
      <DiamondMark size={Math.round(size * 0.58)} />
    </div>
  );

  if (variant === "box") return box;

  // wordmark: box + "Relay" label
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.375), flexShrink: 0 }}>
      {box}
      <span
        style={{
          fontWeight: 700,
          fontSize: Math.round(size * 0.56),
          letterSpacing: "-0.01em",
          // CSS var so server/client agree
          color: "var(--relay-box-bg)",
          fontFamily: "inherit",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        Relay
      </span>
    </div>
  );
}
