/**
 * PlatformLogo — renders a platform logo from /platform-logo/ as a square <img>.
 *
 * Brand-coloured logos (Bluesky, Mastodon, LinkedIn, YouTube) are rendered as-is.
 *
 * Monochrome logos (X, Threads, TikTok) are black SVG paths on a transparent canvas.
 * They receive the CSS class "platform-logo-mono" which globals.css inverts in dark mode
 * via [data-theme="dark"] .platform-logo-mono { filter: invert(1) }.
 * No useTheme() — no hydration mismatch.
 */

const PLATFORM_SRC: Record<string, string> = {
  X:        "/platform-logo/x-logo.svg",
  TWITTER:  "/platform-logo/x-logo.svg",
  BLUESKY:  "/platform-logo/bluesky-logo.svg",
  THREADS:  "/platform-logo/threads-logo.svg",
  MASTODON: "/platform-logo/mastodon-logo.svg",
  LINKEDIN: "/platform-logo/linkedin-logo.svg",
  YOUTUBE:  "/platform-logo/youtube-logo.svg",
  TIKTOK:   "/platform-logo/tiktok-logo.svg",
  INSTAGRAM:   "/platform-logo/instagram-pink-logo.svg",
};

const PLATFORM_ICON: Record<string, string> = {
  X:        "𝕏",
  TWITTER:  "𝕏",
  BLUESKY:  "🦋",
  THREADS:  "🧵",
  MASTODON: "🐘",
  LINKEDIN: "in",
  YOUTUBE:  "▶",
  TIKTOK:   "♪",
};

/** Logos whose SVG paths are purely black on a transparent canvas. */
const MONO_LOGOS = new Set(["X", "TWITTER", "THREADS", "TIKTOK"]);

interface PlatformLogoProps {
  /** Platform key — case-insensitive. E.g. "TWITTER", "bluesky", "x". */
  platform: string;
  /** Size in px for both width and height. Default 20. */
  size?: number;
  /** Extra inline styles passed to the img / span. */
  style?: React.CSSProperties;
}

export function PlatformLogo({ platform, size = 20, style }: PlatformLogoProps) {
  const key  = platform.toUpperCase();
  const src  = PLATFORM_SRC[key];
  const icon = PLATFORM_ICON[key];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={platform}
        width={size}
        height={size}
        // "platform-logo-mono" gets filter:invert(1) in dark mode via globals.css
        className={MONO_LOGOS.has(key) ? "platform-logo-mono" : undefined}
        style={{
          display: "inline-block",
          objectFit: "contain",
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  // Fallback: text glyph — inherits font color from parent.
  return (
    <span
      style={{
        fontSize: size * 0.85,
        lineHeight: 1,
        display: "inline-block",
        flexShrink: 0,
        ...style,
      }}
    >
      {icon ?? platform.charAt(0)}
    </span>
  );
}
