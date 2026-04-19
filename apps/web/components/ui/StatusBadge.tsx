"use client";

/**
 * StatusBadge — compact colored pill for broadcast / post statuses.
 *
 * Maps the backend BroadcastStatus / PostStatus values to semantic colors
 * following the black theme tokens.
 */

import Chip from "@mui/material/Chip";
import { SxProps, Theme } from "@mui/material/styles";

type Status =
  | "PENDING"
  | "QUEUED"
  | "PROCESSING"
  | "SENT"
  | "DONE"
  | "FAILED"
  | "SKIPPED"
  | string;

interface StatusBadgeProps {
  status: Status;
  label?: string;
  size?: "small" | "medium";
  sx?: SxProps<Theme>;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  PENDING:    { label: "Pending",    color: "#92400E", bg: "#FEF3C7" },
  QUEUED:     { label: "Queued",     color: "#1D4ED8", bg: "#DBEAFE" },
  PROCESSING: { label: "Processing", color: "#6D28D9", bg: "#EDE9FE" },
  SENT:       { label: "Sent",       color: "#15803D", bg: "#DCFCE7" },
  DONE:       { label: "Done",       color: "#15803D", bg: "#DCFCE7" },
  FAILED:     { label: "Failed",     color: "#DC2626", bg: "#FEE2E2" },
  SKIPPED:    { label: "Skipped",    color: "#71717A", bg: "#F4F4F5" },
};

const DARK_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  PENDING:    { label: "Pending",    color: "#FCD34D", bg: "rgba(251,191,36,0.12)" },
  QUEUED:     { label: "Queued",     color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
  PROCESSING: { label: "Processing", color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
  SENT:       { label: "Sent",       color: "#4ADE80", bg: "rgba(74,222,128,0.12)" },
  DONE:       { label: "Done",       color: "#4ADE80", bg: "rgba(74,222,128,0.12)" },
  FAILED:     { label: "Failed",     color: "#F87171", bg: "rgba(248,113,113,0.12)" },
  SKIPPED:    { label: "Skipped",    color: "#71717A", bg: "rgba(113,113,122,0.12)" },
};

export function StatusBadge({ status, label, size = "small", sx }: StatusBadgeProps) {
  // We rely on the theme mode for colour selection; using CSS vars is cleanest
  // but for simplicity we embed both palettes and let the theme Paper background hint us.
  // For now, use light palette — theme toggles Paper bg anyway.
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "#71717A", bg: "#F4F4F5" };

  return (
    <Chip
      label={label ?? cfg.label}
      size={size}
      sx={{
        fontWeight: 600,
        fontSize: size === "small" ? "0.7rem" : "0.8rem",
        height: size === "small" ? 20 : 24,
        color: cfg.color,
        bgcolor: cfg.bg,
        border: "none",
        "& .MuiChip-label": { px: 1 },
        ...sx,
      }}
    />
  );
}
