"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import CircularProgress from "@mui/material/CircularProgress";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Checkbox from "@mui/material/Checkbox";
import FormGroup from "@mui/material/FormGroup";
import { api } from "@/lib/api";
import {
  PLATFORMS,
  CONTENT_TYPES,
  PLATFORM_SUPPORT,
  compatibleTypes,
} from "@/lib/platforms";
import { PlatformLogo } from "@/components/PlatformLogo";

/* ── types ──────────────────────────────────────────────────────── */

interface Settings {
  skipHashtag: string;
  pollingIntervalSecs: number;
  pollingEnabled: boolean;
  emailNotifications: boolean;
  emailOnFailureOnly: boolean;
}

interface Me {
  name?: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

interface Account {
  id: string;
  platform: string;
  platformUsername: string;
  isOrigin: boolean;
  isTarget: boolean;
}

const PLATFORM_ID: Record<string, string> = {
  X:        "x",
  TWITTER:  "x",
  BLUESKY:  "bluesky",
  THREADS:  "threads",
  MASTODON: "mastodon",
  LINKEDIN: "linkedin",
  YOUTUBE:  "youtube",
  TIKTOK:   "tiktok",
  INSTAGRAM: "instagram",
  FACEBOOK:  "facebook",
};

const CONNECT_OPTIONS = [
  { id: "bluesky",  label: "Bluesky"     },
  { id: "mastodon", label: "Mastodon"    },
  { id: "x",        label: "X (Twitter)" },
  { id: "linkedin", label: "LinkedIn"    },
  { id: "threads",  label: "Threads"     },
  { id: "youtube",  label: "YouTube"     },
  { id: "tiktok",   label: "TikTok"      },
];

/* ── section wrapper ─────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
      <Box
        sx={(t) => ({
          px: 3, py: 1.75,
          bgcolor: alpha(t.palette.text.primary, 0.03),
          borderBottom: "1px solid",
          borderColor: "divider",
        })}
      >
        <Typography sx={{ fontWeight: 600, fontSize: 13, color: "text.secondary", letterSpacing: "0.04em" }}>
          {title.toUpperCase()}
        </Typography>
      </Box>
      {children}
    </Paper>
  );
}

/* ── account card ────────────────────────────────────────────────── */

function AccountCard({
  account,
  origin,
  onSetOrigin,
  onToggleTarget,
  onDisconnect,
  onConfigure,
}: {
  account: Account;
  origin: Account | undefined;
  onSetOrigin: (id: string) => void;
  onToggleTarget: (id: string, current: boolean) => void;
  onDisconnect: (id: string) => void;
  onConfigure: (account: Account) => void;
}) {
  const pid  = PLATFORM_ID[account.platform] ?? account.platform.toLowerCase();
  const supports = PLATFORM_SUPPORT[pid] ?? [];
  const supportsThreads = supports.includes("threads") || supports.includes("auto_split");

  return (
    <Box
      sx={(t) => ({
        p: 2.5,
        borderRadius: 2,
        border: "1px solid",
        borderColor: account.isOrigin ? "text.primary" : "divider",
        bgcolor: account.isOrigin ? alpha(t.palette.text.primary, 0.02) : "transparent",
        transition: "border-color 0.15s",
      })}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box
          sx={{
            width: 40, height: 40,
            borderRadius: 1.5,
            border: "1px solid", borderColor: "divider",
            bgcolor: "background.paper",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <PlatformLogo platform={account.platform} size={22} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.25 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
              {account.platform.charAt(0) + account.platform.slice(1).toLowerCase()}
            </Typography>
            {account.isOrigin && (
              <Chip label="Origin" size="small" sx={(t) => ({ fontSize: 10, height: 18, fontWeight: 700, bgcolor: "text.primary", color: "primary.contrastText" })} />
            )}
            {account.isTarget && !account.isOrigin && (
              <Chip label="Target" size="small" variant="outlined" sx={{ fontSize: 10, height: 18, fontWeight: 600 }} />
            )}
          </Stack>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>@{account.platformUsername}</Typography>
        </Box>
        <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0 }}>
          <Button
            size="small"
            variant={account.isOrigin ? "contained" : "outlined"}
            onClick={() => onSetOrigin(account.id)}
            sx={{ fontSize: 11, py: 0.5, px: 1.25, minWidth: 0 }}
          >
            {account.isOrigin ? "Origin ✓" : "Set origin"}
          </Button>
          {!account.isOrigin && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => onToggleTarget(account.id, account.isTarget)}
              sx={(t) => ({
                fontSize: 11, py: 0.5, px: 1.25, minWidth: 0,
                borderColor: account.isTarget ? "text.primary" : "divider",
                color: account.isTarget ? "text.primary" : "text.secondary",
              })}
            >
              {account.isTarget ? "Target ✓" : "Add target"}
            </Button>
          )}
          <Button
            size="small"
            onClick={() => onConfigure(account)}
            sx={(t) => ({ fontSize: 11, py: 0.5, px: 1.25, minWidth: 0, color: "text.secondary", "&:hover": { color: "text.primary" } })}
          >
            Configure
          </Button>
          <Button
            size="small"
            onClick={() => onDisconnect(account.id)}
            sx={(t) => ({ fontSize: 11, py: 0.5, px: 1.25, minWidth: 0, color: "error.main", "&:hover": { bgcolor: alpha(t.palette.error.main, 0.06) } })}
          >
            ✕
          </Button>
        </Stack>
      </Stack>

      {/* origin platform's supported content quick-list */}
      {account.isOrigin && (
        <Box
          sx={(t) => ({
            mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider",
          })}
        >
          <Typography sx={{ fontSize: 12, color: "text.disabled", mb: 1, fontWeight: 600, letterSpacing: "0.05em" }}>
            WHAT THIS PLATFORM CAN BROADCAST
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.75}>
            {CONTENT_TYPES.filter((ct) => supports.includes(ct.id)).map((ct) => (
              <Chip
                key={ct.id}
                label={ct.label}
                size="small"
                variant="outlined"
                sx={{ fontSize: 11, height: 22 }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* target platform: show what will sync from origin */}
      {account.isTarget && !account.isOrigin && origin && (() => {
        const originPid = PLATFORM_ID[origin.platform] ?? origin.platform.toLowerCase();
        const synced = compatibleTypes(originPid, pid);
        if (synced.length === 0) return null;
        return (
          <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
            <Typography sx={{ fontSize: 12, color: "text.disabled", mb: 1, fontWeight: 600, letterSpacing: "0.05em" }}>
              WILL RECEIVE FROM {origin.platform}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {CONTENT_TYPES.filter((ct) => synced.includes(ct.id)).map((ct) => (
                <Chip
                  key={ct.id}
                  label={ct.label}
                  size="small"
                  sx={(t) => ({ fontSize: 11, height: 22, bgcolor: alpha(t.palette.success.main, 0.1), color: "success.main", fontWeight: 600 })}
                />
              ))}
            </Stack>
          </Box>
        );
      })()}
    </Box>
  );
}

/* ── configure dialog ────────────────────────────────────────────── */

function ConfigureDialog({
  account,
  origin,
  open,
  onClose,
}: {
  account: Account | null;
  origin: Account | undefined;
  open: boolean;
  onClose: () => void;
}) {
  if (!account) return null;

  const pid = PLATFORM_ID[account.platform] ?? account.platform.toLowerCase();
  const supports = PLATFORM_SUPPORT[pid] ?? [];
  const supportsThreadSplit = supports.includes("threads") || supports.includes("auto_split");
  const supportsLongVideo = supports.includes("long_video");
  const supportsShortVideo = supports.includes("short_video");

  const originPid = origin ? (PLATFORM_ID[origin.platform] ?? origin.platform.toLowerCase()) : null;
  const synced = originPid ? compatibleTypes(originPid, pid) : supports;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
        Configure {account.platform.charAt(0) + account.platform.slice(1).toLowerCase()}
        <Typography component="span" sx={{ ml: 1, fontSize: 13, color: "text.secondary", fontWeight: 400 }}>
          @{account.platformUsername}
        </Typography>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        {/* Role */}
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.secondary", mb: 1.5, letterSpacing: "0.05em" }}>
          ROLE
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          {[
            { label: "Origin", desc: "Posts from here broadcast out", active: account.isOrigin },
            { label: "Target", desc: "Receives broadcasts from origin", active: account.isTarget && !account.isOrigin },
          ].map((r) => (
            <Box
              key={r.label}
              sx={(t) => ({
                flex: 1, p: 2, borderRadius: 2,
                border: "1px solid",
                borderColor: r.active ? "text.primary" : "divider",
                bgcolor: r.active ? alpha(t.palette.text.primary, 0.04) : "transparent",
              })}
            >
              <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 0.25 }}>{r.label}</Typography>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{r.desc}</Typography>
            </Box>
          ))}
        </Stack>

        {/* Content types for this account */}
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.secondary", mb: 1.5, letterSpacing: "0.05em" }}>
          SUPPORTED CONTENT
        </Typography>
        <Box
          sx={(t) => ({
            p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider",
            bgcolor: alpha(t.palette.text.primary, 0.02),
            mb: 3,
          })}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5 }}>
            {CONTENT_TYPES.map((ct) => {
              const has = supports.includes(ct.id);
              return (
                <Stack key={ct.id} direction="row" alignItems="center" spacing={1} sx={{ opacity: has ? 1 : 0.35 }}>
                  <Typography sx={{ color: has ? "success.main" : "text.disabled", fontSize: 14, lineHeight: 1 }}>
                    {has ? "✓" : "×"}
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: has ? "text.primary" : "text.disabled" }}>{ct.label}</Typography>
                </Stack>
              );
            })}
          </Box>
        </Box>

        {/* Sync options */}
        {account.isTarget && origin && synced.length > 0 && (
          <>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.secondary", mb: 1.5, letterSpacing: "0.05em" }}>
              WHAT SYNCS FROM {origin.platform}
            </Typography>
            <Box
              sx={(t) => ({
                p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider",
                mb: 3,
              })}
            >
              <FormGroup>
                {CONTENT_TYPES.filter((ct) => synced.includes(ct.id)).map((ct) => (
                  <FormControlLabel
                    key={ct.id}
                    control={<Checkbox defaultChecked size="small" />}
                    label={
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{ct.label}</Typography>
                        <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>{ct.description}</Typography>
                      </Box>
                    }
                    sx={{ mb: 0.5, alignItems: "flex-start", "& .MuiCheckbox-root": { pt: 0.25 } }}
                  />
                ))}
              </FormGroup>
            </Box>
          </>
        )}

        {/* Thread split option */}
        {supportsThreadSplit && (
          <Box
            sx={(t) => ({
              p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            })}
          >
            <Box>
              <Typography sx={{ fontWeight: 500, fontSize: 14, mb: 0.25 }}>Auto-split long posts into threads</Typography>
              <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                Posts over the character limit will automatically be split into a thread.
              </Typography>
            </Box>
            <Switch defaultChecked size="small" />
          </Box>
        )}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ color: "text.secondary" }}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── connect dialog ──────────────────────────────────────────────── */

type ConnectStep = "pick" | "auth" | "done";

function ConnectDialog({ open, onClose, onConnected }: {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [step, setStep] = useState<ConnectStep>("pick");
  const [selected, setSelected] = useState("");
  const [form, setForm] = useState({ handle: "", password: "", instance: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setStep("pick");
    setSelected("");
    setForm({ handle: "", password: "", instance: "" });
    setError("");
  };

  const handleClose = () => { reset(); onClose(); };

  const connectBluesky = async () => {
    setLoading(true);
    setError("");
    try {
      await api.post("/accounts/connect/bluesky", { handle: form.handle, appPassword: form.password });
      setStep("done");
      onConnected();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Connection failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const startOAuth = async (platform: string) => {
    try {
      let url = "";
      if (platform === "mastodon") {
        const res = await api.get(`/accounts/oauth/mastodon/start?instance=${form.instance}`);
        url = res.data.authUrl;
      } else if (platform === "x") {
        const res = await api.get("/accounts/oauth/twitter/start");
        url = res.data.authUrl;
      } else if (platform === "linkedin") {
        const res = await api.get("/accounts/oauth/linkedin/start");
        url = res.data.authUrl;
      } else if (platform === "youtube") {
        const res = await api.get("/accounts/oauth/youtube/start");
        url = res.data.authUrl;
      } else if (platform === "tiktok") {
        const res = await api.get("/accounts/oauth/tiktok/start");
        url = res.data.authUrl;
      } else {
        // threads (via Meta)
        const res = await api.get(`/accounts/oauth/meta/start?platform=${platform}`);
        url = res.data.authUrl;
      }
      window.location.href = url;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Unknown error";
      console.error("OAuth start error:", err?.response?.data ?? err?.message);
      setError(`Failed to start authorization: ${msg}`);
    }
  };

  const selOpt = CONNECT_OPTIONS.find((o) => o.id === selected);
  const selPlatform = PLATFORMS.find((p) => p.id === selected);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
        {step === "pick" ? "Connect a platform" : step === "auth" ? `Connect ${selOpt?.label}` : "Connected!"}
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        {step === "pick" && (
          <Box>
            <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2.5 }}>
              Choose a platform to link to your account.
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              {CONNECT_OPTIONS.map((opt) => {
                const active = selected === opt.id;
                return (
                  <Box
                    key={opt.id}
                    onClick={() => setSelected(opt.id)}
                    sx={(t) => ({
                      display: "flex", alignItems: "center", gap: 1.5,
                      px: 2, py: 1.5,
                      border: "1px solid",
                      borderColor: active ? "text.primary" : "divider",
                      borderRadius: 2,
                      bgcolor: active ? alpha(t.palette.text.primary, 0.04) : "transparent",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      "&:hover": { borderColor: alpha(t.palette.text.primary, 0.4) },
                    })}
                  >
                    <PlatformLogo platform={opt.id} size={20} />
                    <Typography sx={{ fontWeight: 500, fontSize: 14 }}>{opt.label}</Typography>
                    {active && <Box sx={{ ml: "auto", width: 8, height: 8, borderRadius: "50%", bgcolor: "text.primary" }} />}
                  </Box>
                );
              })}
            </Box>

            {/* Preview of what this platform supports */}
            {selected && selPlatform && (
              <Box
                sx={(t) => ({
                  mt: 2.5, p: 2, borderRadius: 2,
                  border: "1px solid", borderColor: "divider",
                  bgcolor: alpha(t.palette.text.primary, 0.02),
                })}
              >
                <Typography sx={{ fontSize: 12, color: "text.disabled", mb: 1, fontWeight: 600, letterSpacing: "0.05em" }}>
                  {selPlatform.name.toUpperCase()} SUPPORTS
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {CONTENT_TYPES.filter((ct) => (PLATFORM_SUPPORT[selected] ?? []).includes(ct.id)).map((ct) => (
                    <Chip key={ct.id} label={ct.label} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        )}

        {step === "auth" && (
          <Box>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {selected === "bluesky" && (
              <Stack spacing={2}>
                <TextField
                  label="Bluesky handle"
                  size="small"
                  fullWidth
                  placeholder="you.bsky.social"
                  value={form.handle}
                  onChange={(e) => setForm({ ...form, handle: e.target.value })}
                />
                <TextField
                  label="App password"
                  type="password"
                  size="small"
                  fullWidth
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  Generate an app password at bsky.app → Settings → App Passwords. We never store your main password.
                </Typography>
              </Stack>
            )}

            {selected === "mastodon" && (
              <Stack spacing={2}>
                <TextField
                  label="Your Mastodon instance"
                  size="small"
                  fullWidth
                  placeholder="https://mastodon.social"
                  value={form.instance}
                  onChange={(e) => setForm({ ...form, instance: e.target.value })}
                />
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  You'll be redirected to your instance to authorize. No password stored.
                </Typography>
              </Stack>
            )}

            {selected && !["bluesky", "mastodon"].includes(selected) && (
              <Box
                sx={(t) => ({
                  p: 2.5, borderRadius: 2, border: "1px solid", borderColor: "divider",
                  bgcolor: alpha(t.palette.text.primary, 0.02), textAlign: "center",
                })}
              >
                <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
                  <PlatformLogo platform={selected} size={40} />
                </Box>
                <Typography sx={{ fontWeight: 600, mb: 0.5 }}>Authorize with {selOpt?.label}</Typography>
                <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                  You'll be redirected to {selOpt?.label} to grant access. No passwords stored.
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {step === "done" && (
          <Box sx={{ textAlign: "center", py: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <PlatformLogo platform={selected} size={48} />
          </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 1 }}>
              {selOpt?.label} connected!
            </Typography>
            <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
              Set it as your origin to broadcast from here, or as a target to receive posts.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        {step === "pick" && (
          <>
            <Button onClick={handleClose} sx={{ color: "text.secondary" }}>Cancel</Button>
            <Button
              variant="contained"
              disabled={!selected}
              onClick={() => setStep("auth")}
            >
              Continue →
            </Button>
          </>
        )}
        {step === "auth" && (
          <>
            <Button onClick={() => setStep("pick")} sx={{ color: "text.secondary" }}>← Back</Button>
            {selected === "bluesky" && (
              <Button
                variant="contained"
                disabled={loading || !form.handle || !form.password}
                onClick={connectBluesky}
                startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
              >
                {loading ? "Connecting…" : "Connect Bluesky"}
              </Button>
            )}
            {selected === "mastodon" && (
              <Button variant="contained" disabled={!form.instance} onClick={() => startOAuth("mastodon")}>
                Authorize
              </Button>
            )}
            {selected && !["bluesky", "mastodon"].includes(selected) && (
              <Button variant="contained" onClick={() => startOAuth(selected)}>
                Authorize with {selOpt?.label}
              </Button>
            )}
          </>
        )}
        {step === "done" && (
          <Button variant="contained" onClick={handleClose}>Done</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

/* ── compatibility matrix (collapsible) ─────────────────────────── */

function CompatMatrix({ originPlatform }: { originPlatform: string | null }) {
  const [open, setOpen] = useState(false);
  const [selOrigin, setSelOrigin] = useState(originPlatform ?? "x");

  const targets = PLATFORMS.filter((p) => p.id !== selOrigin);
  const originSupport = PLATFORM_SUPPORT[selOrigin] ?? [];

  return (
    <Paper variant="outlined" sx={{ borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
      <Box
        onClick={() => setOpen((v) => !v)}
        sx={(t) => ({
          px: 3, py: 2,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer",
          bgcolor: alpha(t.palette.text.primary, 0.02),
          "&:hover": { bgcolor: alpha(t.palette.text.primary, 0.04) },
          transition: "background-color 0.15s",
        })}
      >
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>What's Supported</Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>
            Platform compatibility matrix — what content syncs where
          </Typography>
        </Box>
        <Typography sx={{ color: "text.disabled", ml: 2 }}>{open ? "▲" : "▼"}</Typography>
      </Box>

      {open && (
        <>
          <Divider />
          <Box sx={{ p: 3 }}>
            {/* Origin selector */}
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary", mb: 1.5, letterSpacing: "0.05em" }}>
              VIEW FROM ORIGIN →
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 3 }}>
              {PLATFORMS.map((p) => (
                <Box
                  key={p.id}
                  onClick={() => setSelOrigin(p.id)}
                  sx={(t) => ({
                    display: "flex", alignItems: "center", gap: 0.75,
                    px: 1.5, py: 0.625,
                    borderRadius: 10,
                    border: "1px solid",
                    borderColor: selOrigin === p.id ? "text.primary" : "divider",
                    bgcolor: selOrigin === p.id ? "text.primary" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.12s",
                    "&:hover": { borderColor: alpha(t.palette.text.primary, 0.4) },
                  })}
                >
                  <Typography sx={{ fontSize: 13 }}>{p.icon}</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 500, color: selOrigin === p.id ? "primary.contrastText" : "text.secondary" }}>
                    {p.name.split(" ")[0]}
                  </Typography>
                </Box>
              ))}
            </Stack>

            {/* Mini matrix */}
            <Box sx={{ overflowX: "auto" }}>
              <Box
                component="table"
                sx={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                  "& th, & td": {
                    px: 1.5, py: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  },
                  "& th:first-of-type, & td:first-of-type": {
                    textAlign: "left",
                    whiteSpace: "normal",
                    minWidth: 140,
                  },
                }}
              >
                <Box component="thead">
                  <Box component="tr" sx={{ "& th": { fontWeight: 600, color: "text.disabled", fontSize: 11, bgcolor: (t) => alpha(t.palette.text.primary, 0.02) } }}>
                    <Box component="th">Content type</Box>
                    {targets.map((p) => (
                      <Box component="th" key={p.id}>
                        <Typography sx={{ fontSize: 14, lineHeight: 1 }}>{p.icon}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {CONTENT_TYPES.map((ct) => {
                    const originHas = originSupport.includes(ct.id);
                    return (
                      <Box component="tr" key={ct.id} sx={{ opacity: originHas ? 1 : 0.3 }}>
                        <Box component="td" sx={{ fontWeight: 500, color: "text.primary", fontSize: 12 }}>{ct.label}</Box>
                        {targets.map((p) => {
                          const ok = originHas && (PLATFORM_SUPPORT[p.id] ?? []).includes(ct.id);
                          return (
                            <Box component="td" key={p.id}>
                              {ok
                                ? <Box component="span" sx={{ color: "success.main", fontWeight: 700 }}>✓</Box>
                                : <Box component="span" sx={{ color: "text.disabled" }}>—</Box>
                              }
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
        </>
      )}
    </Paper>
  );
}

/* ── main page ───────────────────────────────────────────────────── */

function SettingsInner() {
  const params = useSearchParams();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState("");
  const [connectOpen, setConnectOpen] = useState(false);
  const [configAccount, setConfigAccount] = useState<Account | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchAccounts = () => api.get("/accounts").then((r) => setAccounts(r.data));

  useEffect(() => {
    api.get("/settings").then((r) => setSettings(r.data));
    api.get("/auth/me").then((r) => setMe(r.data)).catch(() => {});
    fetchAccounts();

    const connected = params.get("connected");
    const err = params.get("error");
    if (connected) {
      setBanner({ type: "success", msg: `${connected.charAt(0).toUpperCase() + connected.slice(1)} connected!` });
    }
    if (err) {
      setBanner({ type: "error", msg: decodeURIComponent(err) });
    }
    if (connected || err) {
      window.history.replaceState({}, "", "/dashboard/settings");
      setTimeout(() => setBanner(null), 5000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true); setError("");
    try {
      await api.patch("/settings", settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const setOrigin = async (id: string) => {
    await api.post(`/accounts/origin/${id}`);
    fetchAccounts();
  };

  const toggleTarget = async (id: string, isTarget: boolean) => {
    const ids = accounts.filter((a) => (a.id === id ? !isTarget : a.isTarget)).map((a) => a.id);
    await api.post("/accounts/targets", { accountIds: ids });
    fetchAccounts();
  };

  const disconnect = async (id: string) => {
    await api.delete(`/accounts/${id}`);
    fetchAccounts();
  };

  const origin = accounts.find((a) => a.isOrigin);
  const originPid = origin ? (PLATFORM_ID[origin.platform] ?? origin.platform.toLowerCase()) : null;

  if (!settings) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 12 }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  return (
    <Box>
      {/* Banner */}
      {banner && (
        <Alert severity={banner.type} onClose={() => setBanner(null)} sx={{ mb: 3, borderRadius: 2 }}>
          {banner.msg}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 0.5 }}>Settings</Typography>
        <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
          Manage your profile, connected platforms, and broadcasting preferences.
        </Typography>
      </Box>

      {/* Two-column layout */}
      <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start", flexDirection: { xs: "column", lg: "row" } }}>

        {/* ── Left column: profile + settings ── */}
        <Stack spacing={2.5} sx={{ flex: "0 0 500px", maxWidth: { xs: "100%", lg: 500 } }}>

          {/* Profile */}
          {me && (
            <Section title="Profile">
              <Stack direction="row" alignItems="center" spacing={2} sx={{ px: 3, py: 3 }}>
                <Avatar src={me.avatar} alt={me.name ?? me.email} sx={{ width: 52, height: 52, fontSize: 20 }}>
                  {(me.name ?? me.email)[0].toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {me.name && (
                    <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 0.25 }}>{me.name}</Typography>
                  )}
                  <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 0.75 }}>{me.email}</Typography>
                  <Stack direction="row" spacing={0.75}>
                    <Chip label="Google account" size="small" variant="outlined" sx={{ fontSize: 11, height: 22, borderColor: "divider", color: "text.secondary" }} />
                    <Chip
                      label={`Joined ${new Date(me.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: 11, height: 22, borderColor: "divider", color: "text.secondary" }}
                    />
                  </Stack>
                </Box>
              </Stack>
            </Section>
          )}

          {/* Broadcasting */}
          <Section title="Broadcasting">
            <Stack sx={{ px: 3, py: 1 }}>
              {/* Polling toggle */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
                <Box>
                  <Typography sx={{ fontWeight: 500, fontSize: 14 }}>Enable polling</Typography>
                  <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                    Automatically check your origin platform for new posts.
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.pollingEnabled}
                      onChange={(e) => setSettings({ ...settings, pollingEnabled: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="" sx={{ m: 0 }}
                />
              </Box>
              <Divider />
              {/* Polling interval */}
              <Box
                sx={{
                  py: 2,
                  opacity: settings.pollingEnabled ? 1 : 0.45,
                  transition: "opacity 0.2s",
                }}
              >
                <Typography sx={{ fontWeight: 500, fontSize: 14, mb: 0.5 }}>Polling interval (seconds)</Typography>
                <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 1.5 }}>
                  How often Relay checks your origin platform for new posts. Minimum 30 s.
                </Typography>
                <TextField
                  size="small" type="number" fullWidth
                  disabled={!settings.pollingEnabled}
                  value={settings.pollingIntervalSecs}
                  inputProps={{ min: 30, max: 600 }}
                  onChange={(e) => setSettings({ ...settings, pollingIntervalSecs: Number(e.target.value) })}
                />
              </Box>
              <Divider />
              {/* Skip hashtag */}
              <Box sx={{ py: 2 }}>
                <Typography sx={{ fontWeight: 500, fontSize: 14, mb: 0.5 }}>Skip hashtag</Typography>
                <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 1.5 }}>
                  Posts containing this tag won't be broadcast to any platform.
                </Typography>
                <TextField
                  size="small" fullWidth placeholder="#nosync"
                  value={settings.skipHashtag}
                  onChange={(e) => setSettings({ ...settings, skipHashtag: e.target.value })}
                />
              </Box>
            </Stack>
          </Section>

          {/* Notifications */}
          <Section title="Notifications">
            <Stack sx={{ px: 3, py: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
                <Box>
                  <Typography sx={{ fontWeight: 500, fontSize: 14 }}>Email notifications</Typography>
                  <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Receive email alerts for broadcast events.</Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.emailNotifications}
                      onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="" sx={{ m: 0 }}
                />
              </Box>
              <Divider />
              <Box
                sx={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", py: 2,
                  opacity: settings.emailNotifications ? 1 : 0.45,
                  transition: "opacity 0.2s",
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 500, fontSize: 14, color: settings.emailNotifications ? "text.primary" : "text.secondary" }}>
                    Failures only
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Only send an email when a broadcast fails.</Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.emailOnFailureOnly}
                      disabled={!settings.emailNotifications}
                      onChange={(e) => setSettings({ ...settings, emailOnFailureOnly: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="" sx={{ m: 0 }}
                />
              </Box>
            </Stack>
          </Section>

          {error && <Alert severity="error" sx={{ borderRadius: 1.5 }}>{error}</Alert>}

          <Button
            variant="contained"
            onClick={save}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ alignSelf: "flex-start", px: 3, fontWeight: 600 }}
          >
            {saved ? "Saved ✓" : saving ? "Saving…" : "Save settings"}
          </Button>
        </Stack>

        {/* ── Right column: accounts ── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack spacing={2.5}>
            {/* Accounts header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: 16 }}>Connected Accounts</Typography>
                <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.25 }}>
                  {accounts.length === 0
                    ? "No accounts connected yet."
                    : `${accounts.length} platform${accounts.length === 1 ? "" : "s"} connected${origin ? ` · ${origin.platform.charAt(0) + origin.platform.slice(1).toLowerCase()} as origin` : ""}`}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setConnectOpen(true)}
                sx={(t) => ({
                  fontWeight: 600, fontSize: 13, borderColor: "divider",
                  "&:hover": { borderColor: alpha(t.palette.text.primary, 0.4) },
                })}
              >
                + Add account
              </Button>
            </Stack>

            {/* Account cards */}
            {accounts.length === 0 ? (
              <Box
                sx={(t) => ({
                  p: 5, borderRadius: 2, border: "1px dashed", borderColor: "divider",
                  textAlign: "center",
                })}
              >
                <Typography sx={{ fontSize: 28, mb: 1.5 }}>🔗</Typography>
                <Typography sx={{ fontWeight: 600, fontSize: 15, mb: 0.75 }}>No accounts yet</Typography>
                <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2.5 }}>
                  Connect your first platform to start broadcasting.
                </Typography>
                <Button variant="contained" size="small" onClick={() => setConnectOpen(true)}>
                  Connect a platform
                </Button>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {/* Sort: origin first, then targets, then others */}
                {[...accounts]
                  .sort((a, b) => (b.isOrigin ? 1 : 0) - (a.isOrigin ? 1 : 0) || (b.isTarget ? 1 : 0) - (a.isTarget ? 1 : 0))
                  .map((acc) => (
                    <AccountCard
                      key={acc.id}
                      account={acc}
                      origin={origin}
                      onSetOrigin={setOrigin}
                      onToggleTarget={toggleTarget}
                      onDisconnect={disconnect}
                      onConfigure={setConfigAccount}
                    />
                  ))
                }
              </Stack>
            )}

            {/* Platform origin guidance */}
            {accounts.length > 0 && !origin && (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                No origin platform set. Click "Set origin" on one account to start broadcasting.
              </Alert>
            )}

            {/* Compatibility matrix */}
            <CompatMatrix originPlatform={originPid} />
          </Stack>
        </Box>
      </Box>

      {/* Dialogs */}
      <ConnectDialog
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnected={fetchAccounts}
      />
      <ConfigureDialog
        account={configAccount}
        origin={origin}
        open={!!configAccount}
        onClose={() => setConfigAccount(null)}
      />
    </Box>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Stack alignItems="center" justifyContent="center" sx={{ py: 12 }}><CircularProgress size={28} /></Stack>}>
      <SettingsInner />
    </Suspense>
  );
}
