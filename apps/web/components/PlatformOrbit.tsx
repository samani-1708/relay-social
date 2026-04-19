"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";


/** One satellite node around the orbit ring. */
export interface OrbitNode {
  /** Emoji, glyph, or short text rendered as SVG <text>. */
  icon?: string;
  /**
   * Path or URL to an image/SVG rendered as a circular crop.
   * When provided, `icon` is ignored.
   */
  src?: string;
  /**
   * Background fill colour painted behind the image before clipping.
   * Useful when the logo SVG has a transparent background or white paths
   * (e.g. X logo uses white paths → pass "#000000").
   * Defaults to the node's paper background.
   */
  bgColor?: string;
  /** Accessible / display label (also used as React key). */
  label: string;
}

/** The hub node at the centre. */
export interface OrbitCenterNode {
  /** Emoji, glyph, or short text. Default "◈". */
  icon?: string;
  /** If provided, renders a circular <image> crop instead of icon text. */
  src?: string;
  /** Background fill colour behind the image (same logic as OrbitNode.bgColor). */
  bgColor?: string;
  /** Accessible label. */
  label?: string;
}

export interface OrbitConfig {
  // ── layout ──────────────────────────────────────────────────────
  /** SVG canvas width & height in px. Default 360. */
  size?: number;
  /** Orbit ring radius in px. Default 130. */
  orbitRadius?: number;
  /** Centre node radius in px. Default 28. */
  centerRadius?: number;
  /** Satellite node radius in px. Default 22. */
  nodeRadius?: number;
  /** Font size for satellite icon text. Default 17. */
  nodeFontSize?: number;
  /** Font size for center icon text. Default 22. */
  centerFontSize?: number;

  // ── tick badge ──────────────────────────────────────────────────
  /**
   * Angle (radians) at which the ✓ badge is placed on the node perimeter.
   * 0 = right, Math.PI/4 = top-right (default), Math.PI/2 = top.
   */
  tickAngle?: number;
  /** Tick badge circle radius. Default 8. */
  tickRadius?: number;

  // ── animation ───────────────────────────────────────────────────
  /**
   * Speed multiplier applied to every phase duration.
   * 1 = default (~4.4 s/cycle), 2 = twice as fast, 0.5 = half speed.
   */
  signalSpeed?: number;
  /** How many degrees the centre icon spins when a signal arrives. Default 360. */
  centerSpinDeg?: number;

  // ── colours ─────────────────────────────────────────────────────
  /**
   * Signal dot color. Defaults to theme.palette.success.main.
   * Accepts any CSS color string.
   */
  signalColor?: string;
}

/* ─── default node data ──────────────────────────────────────────── */

const DEFAULT_NODES: OrbitNode[] = [
  { icon: "𝕏",  label: "X"        },
  { icon: "🦋", label: "Bluesky"  },
  { icon: "🧵", label: "Threads"  },
  { icon: "🐘", label: "Mastodon" },
  { icon: "in", label: "LinkedIn" },
  { icon: "▶",  label: "YouTube"  },
  { icon: "♪",  label: "TikTok"   },
];

const DEFAULT_CENTER: OrbitCenterNode = { icon: "◈", label: "Hub" };

/* ─── phase base durations (ms) ─────────────────────────────────── */

const BASE_MS = {
  FOCUS:  600,
  IN:     900,
  CENTER: 500,
  BROAD:  900,
  POPPED: 500,
  ROTATE: 800,
  PAUSE:  200,
};

/* ─── helpers ───────────────────────────────────────────────────── */

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function ease(t: number) {
  t = clamp(t, 0, 1);
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
function pp(ct: number, offset: number, dur: number) {
  return clamp((ct - offset) / dur, 0, 1);
}

/* ─── component ─────────────────────────────────────────────────── */

interface Props {
  nodes?: OrbitNode[];
  centerNode?: OrbitCenterNode;
  config?: OrbitConfig;
}

export function PlatformOrbit({ nodes, centerNode, config }: Props = {}) {
  const theme    = useTheme();
  const uid      = useId().replace(/:/g, "");   // unique prefix for SVG IDs
  const elRef    = useRef(0);
  const lastRef  = useRef<number | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    let id: number;
    function frame(ts: number) {
      if (lastRef.current !== null) {
        elRef.current += Math.min(ts - lastRef.current, 100);
      }
      lastRef.current = ts;
      tick(n => n + 1);
      id = requestAnimationFrame(frame);
    }
    id = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(id); lastRef.current = null; };
  }, []);

  /* ── resolve props / config ──────────────────────────────────── */

  const resolvedNodes  = nodes      ?? DEFAULT_NODES;
  const hub            = centerNode ?? DEFAULT_CENTER;
  const N              = resolvedNodes.length;
  const STEP           = (2 * Math.PI) / N;

  const SIZE    = config?.size         ?? 360;
  const CX      = SIZE / 2;
  const CY      = SIZE / 2;
  const R       = config?.orbitRadius  ?? 130;
  const CTR_R   = config?.centerRadius ?? 32;
  const NODE_R  = config?.nodeRadius   ?? 26;
  const NFONT   = config?.nodeFontSize   ?? 17;
  const CFONT   = config?.centerFontSize ?? 22;
  const speed   = config?.signalSpeed  ?? 1;
  const SPIN    = config?.centerSpinDeg ?? 360;

  const TICK_A  = config?.tickAngle  ?? Math.PI / 4;
  const TICK_BR = config?.tickRadius ?? 8;
  const TICK_X  =  NODE_R * Math.cos(TICK_A);
  const TICK_Y  =  NODE_R * Math.sin(TICK_A);

  /* ── phase durations ─────────────────────────────────────────── */

  const D_FOCUS  = BASE_MS.FOCUS  / speed;
  const D_IN     = BASE_MS.IN     / speed;
  const D_CENTER = BASE_MS.CENTER / speed;
  const D_BROAD  = BASE_MS.BROAD  / speed;
  const D_POPPED = BASE_MS.POPPED / speed;
  const D_ROTATE = BASE_MS.ROTATE / speed;
  const D_PAUSE  = BASE_MS.PAUSE  / speed;

  const O_FOCUS  = 0;
  const O_IN     = O_FOCUS  + D_FOCUS;
  const O_CENTER = O_IN     + D_IN;
  const O_BROAD  = O_CENTER + D_CENTER;
  const O_POPPED = O_BROAD  + D_BROAD;
  const O_ROTATE = O_POPPED + D_POPPED;
  const CYCLE    = O_ROTATE + D_ROTATE + D_PAUSE;

  /* ── animation state ─────────────────────────────────────────── */

  const el       = elRef.current;
  const cycleIdx = Math.floor(el / CYCLE);
  const ct       = el % CYCLE;

  const focusP  = pp(ct, O_FOCUS,  D_FOCUS);
  const inP     = pp(ct, O_IN,     D_IN);
  const centP   = pp(ct, O_CENTER, D_CENTER);
  const broadP  = pp(ct, O_BROAD,  D_BROAD);
  const poppedP = pp(ct, O_POPPED, D_POPPED);
  const rotP    = pp(ct, O_ROTATE, D_ROTATE);

  const groupRad  = (cycleIdx + ease(rotP)) * STEP;
  const activeIdx = (N - cycleIdx % N) % N;

  const pos = Array.from({ length: N }, (_, i) => {
    const a = -Math.PI / 2 + i * STEP + groupRad;
    return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
  });

  const ap         = pos[activeIdx];
  const showIn     = inP    > 0 && inP    < 1;
  const showBroad  = broadP > 0 && broadP < 1;
  const isPopped   = poppedP > 0;
  const centerLive = centP  > 0 && centP  < 1;
  const nodeGlows  = focusP > 0 && inP    < 1;

  const centerScale  = 1 + Math.sin(Math.PI * centP) * 0.32;
  const activeScale  = 1 + Math.sin(Math.PI * clamp(focusP, 0, 1)) * 0.18;
  // ◈ spins when CENTER phase is active
  const centerIconRot = ease(centP) * SPIN;

  /* ── colours ─────────────────────────────────────────────────── */

  const primary  = theme.palette.primary.main;
  const priLight = theme.palette.primary.light;
  const success  = config?.signalColor ?? theme.palette.success.main;
  const bgPaper  = theme.palette.background.paper;
  const divCol   = theme.palette.divider;
  const contrast = theme.palette.primary.contrastText;
  const priA12   = alpha(primary, 0.12);
  const priA20   = alpha(primary, 0.20);
  const sucA15   = alpha(success, 0.15);

  /* ─── render ─────────────────────────────────────────────────── */

  const id = (suffix: string) => `${uid}-${suffix}`;


  return (
    <Box sx={{ position: "relative", width: SIZE, height: SIZE, mx: "auto", flexShrink: 0, color: "text.primary" }}>
      <svg width={SIZE} height={SIZE} overflow="visible">
        <defs>
          {/* Glow filters — prefixed with uid so multiple instances don't clash */}
          <filter id={id("green")} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={id("pulse")} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={id("node")} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Circular clip paths for image nodes.
              Radius = NODE_R - 2 keeps the image inside the visible stroke. */}
          {resolvedNodes.map((node, i) =>
            node.src ? (
              <clipPath key={`clip-nd-${i}`} id={id(`nd-clip-${i}`)}>
                <circle r={NODE_R - 2} cx={0} cy={0} />
              </clipPath>
            ) : null
          )}
          {hub.src && (
            <clipPath id={id("ctr-clip")}>
              <circle r={CTR_R - 2} cx={0} cy={0} />
            </clipPath>
          )}
        </defs>

        {/* ── orbit ring ── */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={divCol}
          strokeWidth={1}
          strokeDasharray="4 8"
        />

        {/* ── spokes ── */}
        {pos.map((p, i) => {
          const act = i === activeIdx && nodeGlows;
          return (
            <line
              key={`sp${i}`}
              x1={CX} y1={CY} x2={p.x} y2={p.y}
              stroke={act ? priLight : divCol}
              strokeWidth={act ? 1.5 : 0.75}
              opacity={act ? 0.75 : 0.3}
              style={{ transition: "stroke 0.3s, opacity 0.3s" }}
            />
          );
        })}

        {/* ── incoming signal dot + trail ── */}
        {showIn && [
          { t: 0.08, r: 2.5, o: 0.5 },
          { t: 0.04, r: 3.5, o: 0.7 },
          { t: 0,    r: 5.5, o: 1.0 },
        ].map(({ t, r: dr, o }, ti) => {
          const prog = ease(Math.max(0, inP - t));
          return (
            <circle
              key={`in${ti}`}
              cx={ap.x + (CX - ap.x) * prog}
              cy={ap.y + (CY - ap.y) * prog}
              r={dr}
              fill={success}
              opacity={o}
              filter={ti === 2 ? `url(#${id("green")})` : undefined}
            />
          );
        })}

        {/* ── broadcast dots (center → each other node) ── */}
        {showBroad && pos.map((p, i) => {
          if (i === activeIdx) return null;
          const dx = p.x - CX;
          const dy = p.y - CY;
          return [
            { t: 0.08, r: 2.5, o: 0.5 },
            { t: 0.04, r: 3.5, o: 0.7 },
            { t: 0,    r: 5.5, o: 1.0 },
          ].map(({ t, r: dr, o }, ti) => {
            const prog = ease(Math.max(0, broadP - t));
            return (
              <circle
                key={`br${i}-${ti}`}
                cx={CX + dx * prog}
                cy={CY + dy * prog}
                r={dr}
                fill={success}
                opacity={o}
                filter={ti === 2 ? `url(#${id("green")})` : undefined}
              />
            );
          });
        })}

        {/* ── satellite nodes ── */}
        {pos.map((p, i) => {
          const node      = resolvedNodes[i];
          const isAct     = i === activeIdx;
          const isPop     = isPopped && !isAct;
          const scale     = isAct ? activeScale : (isPop ? 1.18 : 1);
          const stroke    = isAct && nodeGlows ? primary : isPop ? success : divCol;
          const sw        = isAct && nodeGlows ? 2.5 : isPop ? 2 : 1;
          const tickOpacity = isPop ? Math.min(1, poppedP * 2.5) : 0;

          return (
            <g key={node.label} transform={`translate(${p.x},${p.y})`}>
              {/* active glow halo */}
              {isAct && nodeGlows && (
                <circle
                  r={NODE_R + 8}
                  fill={priA20}
                  opacity={Math.sin(Math.PI * clamp(focusP, 0, 1))}
                  filter={`url(#${id("node")})`}
                />
              )}
              {/* popped ripple */}
              {isPop && (
                <circle r={NODE_R + 8} fill={sucA15} opacity={1 - poppedP} />
              )}
              {/* node body */}
              <circle r={NODE_R * scale} fill={bgPaper} stroke={stroke} strokeWidth={sw} />
              {/* icon — image or text */}
              {node.src ? (
                <>
                  {/* optional caller-supplied background behind the image */}
                  {node.bgColor && (
                    <circle r={NODE_R - 2} fill={node.bgColor} />
                  )}
                  {/*
                    imgHalf = 72 % of node radius → ~28 % breathing room from the border.
                    "meet" scales the logo to fit entirely inside the box (no cropping),
                    then the clipPath removes the rectangle's protruding corners.
                    Monochrome logos get the invert filter in dark mode.
                  */}
                  <image
                    href={node.src}
                    x={-(NODE_R * 0.62)} y={-(NODE_R * 0.62)}
                    width={NODE_R * 1.24} height={NODE_R * 1.24}
                    clipPath={`url(#${id(`nd-clip-${i}`)})`}
                    preserveAspectRatio="xMidYMid meet"
                    // "platform-logo-mono" → globals.css applies filter:invert(1) in dark mode
                    className={["X","THREADS","TIKTOK"].includes(node.label.toUpperCase()) ? "platform-logo-mono" : undefined}
                  />
                </>
              ) : (
                /* fill="currentColor" so glyphs (𝕏 ▶ ♪ in) respect theme */
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={NFONT}
                  fill="currentColor"
                  style={{ userSelect: "none", pointerEvents: "none" }}
                >
                  {node.icon}
                </text>
              )}
              {/* ✓ tick badge — centre sits on node perimeter at TICK_ANGLE */}
              {isPop && tickOpacity > 0 && (
                <g transform={`translate(${TICK_X},${-TICK_Y})`} opacity={tickOpacity}>
                  <circle r={TICK_BR} fill={success} />
                  <path
                    d="M -2.8 0.4 L -0.6 2.8 L 3.8 -2.6"
                    stroke="white"
                    strokeWidth={1.9}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              )}
            </g>
          );
        })}

        {/* ── center node ── */}
        <g transform={`translate(${CX},${CY})`}>
          {/* ripple rings during CENTER phase */}
          {centerLive && (
            <>
              <circle
                r={CTR_R + 6 + 22 * Math.sin(Math.PI * centP)}
                fill="none" stroke={primary} strokeWidth={1.5}
                opacity={0.35 * Math.sin(Math.PI * centP)}
              />
              <circle
                r={CTR_R + 6 + 46 * Math.sin(Math.PI * centP)}
                fill="none" stroke={primary} strokeWidth={1}
                opacity={0.18 * Math.sin(Math.PI * centP)}
              />
            </>
          )}
          {/* glow blob */}
          {centerLive && (
            <circle
              r={CTR_R + 12}
              fill={priA12}
              opacity={Math.sin(Math.PI * centP)}
              filter={`url(#${id("pulse")})`}
            />
          )}
          {/* main circle */}
          <circle
            r={CTR_R * centerScale}
            fill={primary}
            filter={centerLive ? `url(#${id("pulse")})` : undefined}
          />
          {/* icon — image or spinning text */}
          {hub.src ? (
            <>
              {hub.bgColor && (
                <circle r={CTR_R - 2} fill={hub.bgColor} />
              )}
              <image
                href={hub.src}
                x={-(CTR_R * 0.62)} y={-(CTR_R * 0.62)}
                width={CTR_R * 1.24} height={CTR_R * 1.24}
                clipPath={`url(#${id("ctr-clip")})`}
                preserveAspectRatio="xMidYMid meet"
              />
            </>
          ) : (
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={CFONT}
              fontWeight="800"
              fill={contrast}
              transform={`rotate(${centerIconRot})`}
              style={{ userSelect: "none", pointerEvents: "none" }}
            >
              {hub.icon ?? "◈"}
            </text>
          )}
        </g>
      </svg>
    </Box>
  );
}
