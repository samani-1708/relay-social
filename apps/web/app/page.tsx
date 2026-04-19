"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PlatformOrbit, type OrbitNode } from "@/components/PlatformOrbit";
import { PlatformLogo } from "@/components/PlatformLogo";
import { RelayLogo } from "@/components/RelayLogo";
import { PLATFORMS, CONTENT_TYPES, PLATFORM_SUPPORT } from "@/lib/platforms";
import {
  ArrowForward,
  AutoGraphOutlined,
  BroadcastOnHomeOutlined,
  Diversity1Outlined,
  HubOutlined,
  LightbulbOutlined,
  MobileFriendlyOutlined,
  SyncOutlined,
} from "@mui/icons-material";

/* ─── orbit nodes ───────────────────────────────────────────────── */
//
// bgColor = background circle painted behind the image *before* clipping.
// Required when the SVG has white paths on a transparent canvas (X, Threads, TikTok).
// Logos that already carry their own background (LinkedIn, YouTube, Bluesky, Mastodon)
// don't need it — leave bgColor undefined.
//
const ORBIT_NODES: OrbitNode[] = [
  { src: "/platform-logo/x-logo.svg", label: "X" },
  { src: "/platform-logo/bluesky-logo.svg", label: "Bluesky" },
  { src: "/platform-logo/threads-logo.svg", label: "Threads" },
  { src: "/platform-logo/mastodon-logo.svg", label: "Mastodon" },
  { src: "/platform-logo/instagram-pink-logo.svg", label: "Instagram" },
  { src: "/platform-logo/linkedin-logo.svg", label: "LinkedIn" },
  { src: "/platform-logo/youtube-logo.svg", label: "YouTube" },
  { src: "/platform-logo/tiktok-logo.svg", label: "TikTok" },
];

/* ─── static data ───────────────────────────────────────────────── */

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Connect your accounts",
    description:
      "Link all your social platforms in seconds. No passwords stored — we use OAuth.",
    detail:
      "Supports X, Bluesky, Threads, Mastodon, LinkedIn, YouTube & TikTok.",
  },
  {
    step: "02",
    title: "Pick your origin",
    description:
      "Choose where you naturally post. The app watches it and picks up every new post.",
    detail:
      "Set X as origin? Every tweet auto-broadcasts. Switch to TikTok? Videos sync everywhere they're supported.",
  },
  {
    step: "03",
    title: "Reach everywhere",
    description:
      "Every post is adapted per platform — threaded, truncated, or reformatted automatically.",
    detail:
      "Long posts split into threads. Videos stay as videos. Images keep their captions.",
  },
];

const FEATURES = [
  {
    icon: "🧵",
    title: "Smart threading",
    description:
      "Long posts auto-split into threads on X, Bluesky, Mastodon and Threads.",
  },
  {
    icon: "🔕",
    title: "#nosync skip tag",
    description:
      "Add #nosync to any post and it stays private on your origin platform only.",
  },
  {
    icon: "✏️",
    title: "Built-in editor",
    description:
      "Compose from the app with live previews showing how each platform will render it.",
  },
  {
    icon: "🔄",
    title: "Auto token refresh",
    description:
      "Platform tokens refreshed proactively — broadcasts never fail from expired auth.",
  },
  {
    icon: "🔒",
    title: "Encrypted at rest",
    description:
      "All platform credentials stored AES-256-GCM encrypted. We never see your tokens.",
  },
  {
    icon: "📬",
    title: "Failure alerts",
    description:
      "Get notified instantly by email if a broadcast fails so nothing slips through.",
  },
];

/* ─── compatibility matrix component ────────────────────────────── */

function CompatibilityMatrix({
  selectedOrigin,
  onOriginChange,
}: {
  selectedOrigin: string;
  onOriginChange: (id: string) => void;
}) {
  const targets = PLATFORMS.filter((p) => p.id !== selectedOrigin);
  const originSupport = PLATFORM_SUPPORT[selectedOrigin] ?? [];

  return (
    <Box>
      {/* Source picker */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 600,
            color: "text.secondary",
            mb: 1.5,
            letterSpacing: "0.06em",
          }}
        >
          ORIGIN PLATFORM
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {PLATFORMS.map((p) => (
            <Box
              key={p.id}
              onClick={() => onOriginChange(p.id)}
              className={selectedOrigin === p.id ? "logo-selected" : undefined}
              sx={(t) => ({
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.75,
                py: 0.875,
                borderRadius: 2,
                border: "1px solid",
                borderColor:
                  selectedOrigin === p.id ? "text.primary" : "divider",
                bgcolor:
                  selectedOrigin === p.id ? "text.primary" : "transparent",
                cursor: "pointer",
                transition: "all 0.15s",
                "&:hover": {
                  borderColor:
                    selectedOrigin === p.id
                      ? "text.primary"
                      : alpha(t.palette.text.primary, 0.4),
                },
              })}
            >
              <PlatformLogo platform={p.id} size={16} />
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 500,
                  color:
                    selectedOrigin === p.id
                      ? "primary.contrastText"
                      : "text.secondary",
                }}
              >
                {p.name}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Table */}
      <Box sx={{ overflowX: "auto" }}>
        <Box
          component="table"
          sx={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            "& th, & td": {
              px: 2,
              py: 1.25,
              borderBottom: "1px solid",
              borderColor: "divider",
              textAlign: "center",
              whiteSpace: "nowrap",
            },
            "& th:first-of-type, & td:first-of-type": {
              textAlign: "left",
              whiteSpace: "normal",
              minWidth: 160,
            },
          }}
        >
          <Box component="thead">
            <Box
              component="tr"
              sx={{
                "& th": {
                  fontWeight: 600,
                  color: "text.secondary",
                  fontSize: 12,
                  bgcolor: (t) => alpha(t.palette.text.primary, 0.03),
                },
              }}
            >
              <Box component="th">
                From{" "}
                <Box
                  component="span"
                  sx={{ color: "text.primary", fontWeight: 700 }}
                >
                  {PLATFORMS.find((p) => p.id === selectedOrigin)?.icon}{" "}
                  {PLATFORMS.find((p) => p.id === selectedOrigin)?.name}
                </Box>{" "}
                to →
              </Box>
              {targets.map((p) => (
                <Box component="th" key={p.id}>
                  <Box
                    sx={{ display: "flex", justifyContent: "center", mb: 0.5 }}
                  >
                    <PlatformLogo platform={p.id} size={18} />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: 11,
                      color: "text.secondary",
                      fontWeight: 600,
                    }}
                  >
                    {p.name.split(" ")[0]}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {CONTENT_TYPES.map((ct) => {
              const originHas = originSupport.includes(ct.id);
              return (
                <Box
                  component="tr"
                  key={ct.id}
                  sx={(t) => ({
                    opacity: originHas ? 1 : 0.38,
                    "&:hover td": {
                      bgcolor: alpha(t.palette.text.primary, 0.02),
                    },
                  })}
                >
                  <Box
                    component="td"
                    sx={{ fontWeight: 500, color: "text.primary" }}
                  >
                    {ct.label}
                    {!originHas && (
                      <Typography
                        component="span"
                        sx={{
                          ml: 1,
                          fontSize: 11,
                          color: "text.disabled",
                          fontStyle: "italic",
                        }}
                      >
                        (not on origin)
                      </Typography>
                    )}
                  </Box>
                  {targets.map((p) => {
                    const supported =
                      originHas &&
                      (PLATFORM_SUPPORT[p.id] ?? []).includes(ct.id);
                    return (
                      <Box component="td" key={p.id}>
                        {supported ? (
                          <Box
                            component="span"
                            sx={{
                              color: "success.main",
                              fontWeight: 700,
                              fontSize: 15,
                            }}
                          >
                            ✓
                          </Box>
                        ) : (
                          <Box
                            component="span"
                            sx={{ color: "text.disabled", fontSize: 13 }}
                          >
                            —
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function PageNavigation(props: { router: ReturnType<typeof useRouter> }) {
  return (
    <Box
      component="nav"
      sx={(t) => ({
        position: "sticky",
        top: 0,
        zIndex: 50,
        bgcolor: alpha(t.palette.background.default, 0.9),
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid",
        borderColor: "divider",
        px: { xs: 3, md: 6 },
        py: 1.75,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      })}
    >
      <RelayLogo variant="wordmark" size={30} />

      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{ display: { xs: "none", md: "flex" } }}
      >
        {[
          { label: "Features", href: null },
          { label: "How it works", href: null },
          { label: "Dashboard", href: "/dashboard" },
        ].map(({ label, href }) => (
          <Button
            key={label}
            onClick={() => href && props.router.push(href)}
            sx={(t) => ({
              color: "text.secondary",
              fontSize: 14,
              fontWeight: 500,
              px: 1.5,
              "&:hover": {
                color: "text.primary",
                bgcolor: alpha(t.palette.text.primary, 0.04),
              },
            })}
          >
            {label}
          </Button>
        ))}
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1}>
        <ThemeToggle />
        <Button
          variant="outlined"
          size="medium"
          onClick={() => props.router.push("/auth/login")}
          endIcon={<ArrowForward />}
          sx={{ fontSize: 13, fontWeight: 600 }}
        >
          Start 7-day free trial
        </Button>
      </Stack>
    </Box>
  );
}

function Section(props: React.PropsWithChildren<{}>) {
  return <Box sx={{ py: { xs: 8, md: 10 }, px: 3 }}>{props.children}</Box>;
}

function HeroSection(props: { router: ReturnType<typeof useRouter> }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        alignItems: "center",
        justifyContent: "center",
        gap: { xs: 6, md: 8 },
        maxWidth: 1100,
        mx: "auto",
      }}
    >
      {/* Left copy */}
      <Box
        sx={{ flex: 1, minWidth: 0, textAlign: { xs: "center", md: "left" } }}
      >
        <Typography
          variant="h1"
          sx={{ fontSize: { xs: 38, md: 54 }, lineHeight: 1.1, mb: 2.5 }}
        >
          Post once.{" "}
          <Box
            component="span"
            sx={{ borderBottom: "3px solid", borderColor: "text.primary" }}
          >
            Reach everywhere.
          </Box>
        </Typography>

        <Typography
          sx={{
            fontSize: { xs: 16, md: 18 },
            color: "text.secondary",
            lineHeight: 1.75,
            mb: 4,
            maxWidth: 480,
            mx: { xs: "auto", md: 0 },
          }}
        >
          Connect all your social accounts, pick an origin platform, and Relay
          automatically broadcasts every post — adapted for each one.
        </Typography>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent={{ xs: "center", md: "flex-start" }}
        >
          <Button
            variant="contained"
            size="large"
            onClick={() => props.router.push("/auth/login")}
            endIcon={<ArrowForward />}
          >
            Start 7-day free trial
          </Button>
        </Stack>

        {/* Stats row */}
        <Stack
          direction="row"
          spacing={4}
          sx={{ mt: 5, justifyContent: { xs: "center", md: "flex-start" } }}
        >
          {[
            { key: "platform", value: <HubOutlined />, label: "8 Platforms" },
            {
              key: "origin",
              value: <MobileFriendlyOutlined />,
              label: "Post once",
            },
            {
              key: "grow",
              value: <AutoGraphOutlined />,
              label: "Grow everywhere",
            },
          ].map((s) => (
            <Box key={s.key}>
              <Typography
                sx={{
                  textAlign: "center",
                  fontSize: 24,
                  fontWeight: 800,
                  color: "text.primary",
                  lineHeight: 1,
                }}
              >
                {s.value}
              </Typography>
              <Typography
                sx={{ fontSize: 12, color: "text.disabled", mt: 0.5 }}
              >
                {s.label}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Right: animated orbit */}
      <PlatformOrbit nodes={ORBIT_NODES} />
    </Box>
  );
}

function PlatformSupportedStrip() {
  return (
    <Box
      sx={{
        borderTop: "1px solid",
        borderBottom: "1px solid",
        borderColor: "divider",
        py: 2.5,
        px: 3,
      }}
    >
      <Typography
        sx={{
          textAlign: "center",
          fontSize: 12,
          color: "text.disabled",
          fontWeight: 600,
          letterSpacing: "0.08em",
          mb: 1.5,
        }}
      >
        SUPPORTED PLATFORMS
      </Typography>
      <Stack
        direction="row"
        spacing={2}
        justifyContent="center"
        flexWrap="wrap"
        gap={1}
      >
        {PLATFORMS.map((p) => (
          <Stack
            key={p.id}
            direction="row"
            alignItems="center"
            spacing={1}
            sx={(t) => ({
              px: 2,
              py: 0.75,
              borderRadius: 10,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: alpha(t.palette.text.primary, 0.02),
              transition: "border-color 0.15s",
              "&:hover": { borderColor: alpha(t.palette.text.primary, 0.3) },
            })}
          >
            <PlatformLogo platform={p.id} size={16} />
            <Typography
              sx={{ fontSize: 13, color: "text.secondary", fontWeight: 500 }}
            >
              {p.name}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

function WhatIsSupported() {
  const [selectedOrigin, setSelectedOrigin] = useState("x");
  return (
    <Box sx={{ py: { xs: 10, md: 14 }, px: 3, maxWidth: 1100, mx: "auto" }}>
      <Box sx={{ textAlign: "center", mb: 8 }}>
        <Typography variant="h2" sx={{ fontSize: { xs: 28, md: 40 }, mb: 2 }}>
          What is supported?
        </Typography>
        <Typography
          sx={{
            color: "text.secondary",
            fontSize: 16,
            maxWidth: 540,
            mx: "auto",
          }}
        >
          Pick your origin platform and see exactly what syncs — not everything
          works everywhere, and we show you exactly what will.
        </Typography>
      </Box>

      <Box
        sx={(t) => ({
          p: { xs: 3, md: 4 },
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          bgcolor: "background.paper",
        })}
      >
        <CompatibilityMatrix
          selectedOrigin={selectedOrigin}
          onOriginChange={setSelectedOrigin}
        />
      </Box>

      {/* Notes */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 3 }}>
        {[
          {
            key: "video",
            icon: (
              <Stack direction="column" spacing={2}>
                <PlatformLogo platform="youtube" size={16} />{" "}
                <PlatformLogo platform="tiktok" size={16} />
              </Stack>
            ),
            note: "YouTube & TikTok as origin only sync videos — that's all they publish.",
          },
          {
            key: "thread",
            icon: "🧵",
            note: "Threads auto-splitting works on all text-capable platforms.",
          },
          {
            key: "nosync",
            icon: "🔕",
            note: "Add #nosync to any post to skip broadcast entirely.",
          },
        ].map((n) => (
          <Box
            key={n.key}
            sx={(t) => ({
              alignItems: "center",
              flex: 1,
              display: "flex",
              gap: 1.5,
              p: 2,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: alpha(t.palette.text.primary, 0.02),
            })}
          >
            <Typography sx={{ fontSize: 15, flexShrink: 0 }}>
              {n.icon}
            </Typography>
            <Typography
              sx={{ fontSize: 13, color: "text.secondary", lineHeight: 1.6 }}
            >
              {n.note}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

// ─── Pure-SVG growth graph ───────────────────────────────────────────────────
//
// No chart library — hand-crafted bezier path with a natural S-curve shape.
// The curve has a slight plateau in the middle (realistic early-growth plateau)
// before accelerating, so it reads as real data rather than a toy illustration.

function GrowthGraph() {
  const line =
    "M 130,188 C 160,187 178,185 200,181 S 252,168 288,154 " +
    "S 348,130 380,118 S 430,104 448,100 S 488,92 520,74 " +
    "S 582,46 622,34 S 672,22 710,18";

  const area = `${line} L 710,202 L 130,202 Z`;

  const dots = [
    { cx: 288, cy: 154 },
    { cx: 448, cy: 100 },
    { cx: 622, cy: 34 },
  ];

  return (
    <svg
      viewBox="115 0 610 210"
      width="100%"
      style={{ display: "block", overflow: "visible" }}
      aria-label="Audience reach growth chart"
    >
      <defs>
        <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path d={area} fill="url(#gArea)" />

      {/* Main line */}
      <path
        d={line}
        fill="none"
        stroke="url(#gLine)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Milestone dots */}
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r="4" fill="#22c55e" />
      ))}

      {/* Start dot */}
      <circle cx="130" cy="188" r="14" fill="#22c55e" fillOpacity="0.10" />
      <circle cx="130" cy="188" r="7" fill="#22c55e" fillOpacity="0.22" />
      <circle cx="130" cy="188" r="4" fill="#22c55e" />

      {/* End dot */}
      <circle cx="710" cy="18" r="16" fill="#22c55e" fillOpacity="0.08" />
      <circle cx="710" cy="18" r="10" fill="#22c55e" fillOpacity="0.18" />
      <circle cx="710" cy="18" r="5" fill="#22c55e" />
    </svg>
  );
}

function GrowthGraphSection() {
  return (
    <Box
      sx={(t) => ({
        py: { xs: 8, md: 10 },
        px: 3,
      })}
    >
      <Box sx={{ maxWidth: 800, mx: "auto" }}>
        <Box sx={{ textAlign: "center", mb: 8 }}>
          <Typography variant="h2" sx={{ fontSize: { xs: 28, md: 40 }, mb: 2 }}>
            Your audience compounds everywhere
          </Typography>
          <Typography
            sx={{
              color: "text.secondary",
              fontSize: 16,
              maxWidth: 620,
              mx: "auto",
              lineHeight: 1.75,
            }}
          >
            Every platform you reach is an additional channel growing in
            parallel. Relay users start seeing meaningful reach expansion within
            the first weeks.
          </Typography>
        </Box>

        <Box sx={{ maxWidth: 620, mx: "auto" }}>
          <GrowthGraph />
        </Box>

        {/* Callout chips below the graph */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
          flexWrap="wrap"
          sx={{ mt: 6 }}
        >
          {[
            {
              color: "success.main",
              emoji: <AutoGraphOutlined />,
              text: "Increased engagement",
            },
            {
              color: "info.main",
              emoji: <Diversity1Outlined />,
              text: "Diversified audience",
            },
            {
              color: "warning.main",
              emoji: <LightbulbOutlined />,
              text: "More growth opportunities",
            },
          ].map((item) => (
            <Stack
              key={item.text}
              direction="row"
              alignItems="center"
              justifyContent={"center"}
              spacing={1}
              sx={{
                px: 2.5,
                py: 1.25,
              }}
            >
              <Typography sx={(theme) => ({ fontSize: 20, color: item.color })}>
                {item.emoji}
              </Typography>
              <Typography
                sx={{ fontSize: 13, color: "text.secondary", lineHeight: 1.5 }}
              >
                {item.text}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <PageNavigation router={router} />
      {/* ── Hero ───────────────────────────────────────────────── */}
      <Section>
        <HeroSection router={router} />
      </Section>
      {/* ── Platform strip ─────────────────────────────────────── */}
      <PlatformSupportedStrip />
      {/* ── What's Supported (Compatibility Matrix) ─────────────── */}
      <WhatIsSupported />

      {/* ── How it works ───────────────────────────────────────── */}
      <Box
        sx={(t) => ({
          py: { xs: 10, md: 14 },
          px: 3,
          bgcolor: alpha(t.palette.text.primary, 0.025),
          borderTop: "1px solid",
          borderBottom: "1px solid",
          borderColor: "divider",
        })}
      >
        <Box sx={{ maxWidth: 900, mx: "auto", textAlign: "center", mb: 8 }}>
          <Chip
            label="How it works"
            size="small"
            sx={(t) => ({
              mb: 2,
              bgcolor: alpha(t.palette.text.primary, 0.06),
              color: "text.secondary",
              border: "1px solid",
              borderColor: "divider",
              fontWeight: 600,
              fontSize: 12,
            })}
          />
          <Typography variant="h2" sx={{ fontSize: { xs: 28, md: 40 }, mb: 2 }}>
            Simple by design
          </Typography>
          <Typography
            sx={{
              color: "text.secondary",
              fontSize: 16,
              maxWidth: 500,
              mx: "auto",
            }}
          >
            Three steps from sign-up to broadcasting across all your platforms.
          </Typography>
        </Box>

        <Box
          sx={{
            maxWidth: 900,
            mx: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          {HOW_IT_WORKS.map((step, idx) => (
            <Box
              key={step.step}
              onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
              sx={(t) => ({
                p: 3.5,
                borderRadius: 2.5,
                border: "1px solid",
                borderColor: expandedStep === idx ? "text.primary" : "divider",
                bgcolor:
                  expandedStep === idx
                    ? alpha(t.palette.text.primary, 0.03)
                    : "background.paper",
                mb: 1.5,
                cursor: "pointer",
                transition: "border-color 0.2s, background-color 0.2s",
                "&:hover": {
                  borderColor:
                    expandedStep === idx
                      ? "text.primary"
                      : alpha(t.palette.text.primary, 0.35),
                },
                position: "relative",
                overflow: "hidden",
                "&::before":
                  expandedStep === idx
                    ? {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: 3,
                        bgcolor: "text.primary",
                      }
                    : {},
              })}
            >
              <Stack
                direction="row"
                alignItems="flex-start"
                justifyContent="space-between"
                spacing={2}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "text.disabled",
                      letterSpacing: "0.12em",
                      mb: 1,
                    }}
                  >
                    STEP {step.step}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: 17, mb: 0.75 }}>
                    {step.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 14,
                      color: "text.secondary",
                      lineHeight: 1.7,
                    }}
                  >
                    {step.description}
                  </Typography>
                  {expandedStep === idx && (
                    <Box
                      sx={(t) => ({
                        mt: 2,
                        p: 2,
                        borderRadius: 1.5,
                        bgcolor: alpha(t.palette.text.primary, 0.04),
                        border: "1px solid",
                        borderColor: "divider",
                      })}
                    >
                      <Typography
                        sx={{
                          fontSize: 13.5,
                          color: "text.secondary",
                          lineHeight: 1.7,
                        }}
                      >
                        {step.detail}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Typography
                  sx={{
                    fontSize: 13,
                    color: "text.disabled",
                    flexShrink: 0,
                    mt: 0.5,
                  }}
                >
                  {expandedStep === idx ? "▲" : "▼"}
                </Typography>
              </Stack>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Features grid ──────────────────────────────────────── */}
      <Box sx={{ py: { xs: 8, md: 12 }, px: 3, maxWidth: 1060, mx: "auto" }}>
        <Box sx={{ textAlign: "center", mb: 8 }}>
          <Chip
            label="Features"
            size="small"
            sx={(t) => ({
              mb: 2,
              bgcolor: alpha(t.palette.text.primary, 0.06),
              color: "text.secondary",
              border: "1px solid",
              borderColor: "divider",
              fontWeight: 600,
              fontSize: 12,
            })}
          />
          <Typography variant="h2" sx={{ fontSize: { xs: 28, md: 38 } }}>
            Everything you need
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2,1fr)",
              md: "repeat(3,1fr)",
            },
            gap: 2,
          }}
        >
          {FEATURES.map((f) => (
            <Box
              key={f.title}
              sx={(t) => ({
                p: 3,
                borderRadius: 2.5,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                transition: "border-color 0.2s, transform 0.2s",
                "&:hover": {
                  borderColor: alpha(t.palette.text.primary, 0.35),
                  transform: "translateY(-2px)",
                },
              })}
            >
              <Typography sx={{ fontSize: 26, mb: 1.5, lineHeight: 1 }}>
                {f.icon}
              </Typography>
              <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 0.75 }}>
                {f.title}
              </Typography>
              <Typography
                sx={{
                  fontSize: 13.5,
                  color: "text.secondary",
                  lineHeight: 1.65,
                }}
              >
                {f.description}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Growth graph ───────────────────────────────────────── */}
      <GrowthGraphSection />

      {/* ── CTA banner ─────────────────────────────────────────── */}
      <Box sx={{ py: { xs: 10, md: 14 }, px: 3 }}>
        <Box
          sx={{
            maxWidth: 680,
            mx: "auto",
            textAlign: "center",
            p: { xs: 5, md: 8 },
            borderRadius: 3,
            border: "1px solid",
            borderColor: "text.primary",
            bgcolor: "background.paper",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* grid pattern */}
          <Box
            sx={(t) => ({
              position: "absolute",
              inset: 0,
              backgroundImage: `
                linear-gradient(${alpha(t.palette.text.primary, 0.04)} 1px, transparent 1px),
                linear-gradient(90deg, ${alpha(t.palette.text.primary, 0.04)} 1px, transparent 1px)
              `,
              backgroundSize: "24px 24px",
              pointerEvents: "none",
            })}
          />

          <Typography
            variant="h2"
            sx={{ fontSize: { xs: 26, md: 40 }, mb: 2, position: "relative" }}
          >
            Ready to relay your content?
          </Typography>
          <Typography
            sx={{
              color: "text.secondary",
              fontSize: 16,
              mb: 4,
              position: "relative",
            }}
          >
            Connect your first platform in under 60 seconds.
            <br />
            No credit card required.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => router.push("/auth/login")}
            endIcon={<ArrowForward />}
          >
            Start 7-day free trial
          </Button>
        </Box>
      </Box>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <Box
        component="footer"
        sx={{
          borderTop: "1px solid",
          borderColor: "divider",
          py: 4,
          px: { xs: 3, md: 6 },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <RelayLogo variant="box" size={22} />
          <Typography sx={{ fontSize: 13, color: "text.disabled" }}>
            © 2026 Relay. All rights reserved.
          </Typography>
        </Stack>

        <Stack direction="row" spacing={3}>
          {["Privacy", "Terms", "Contact"].map((item) => (
            <Typography
              key={item}
              sx={{
                fontSize: 13,
                color: "text.disabled",
                cursor: "pointer",
                "&:hover": { color: "text.secondary" },
                transition: "color 0.15s",
              }}
            >
              {item}
            </Typography>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
