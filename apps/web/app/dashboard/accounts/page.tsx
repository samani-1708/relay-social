"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Divider from "@mui/material/Divider";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import CircularProgress from "@mui/material/CircularProgress";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import { api } from "@/lib/api";
import { PlatformLogo } from "@/components/PlatformLogo";

const CONNECT_OPTIONS = [
  { id: "bluesky",  label: "Bluesky"     },
  { id: "mastodon", label: "Mastodon"    },
  { id: "twitter",  label: "X (Twitter)" },
  { id: "linkedin", label: "LinkedIn"    },
  { id: "threads",  label: "Threads"     },
  { id: "youtube",  label: "YouTube"     },
  { id: "tiktok",   label: "TikTok"      },
];

function AccountsInner() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectForm, setConnectForm] = useState({
    type: "",
    handle: "",
    password: "",
    instance: "",
  });
  const [banner, setBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const params = useSearchParams();

  const fetchAccounts = () =>
    api.get("/accounts").then((r) => setAccounts(r.data));

  useEffect(() => {
    fetchAccounts();
    const connected = params.get("connected");
    const err = params.get("error");
    if (connected) {
      setBanner({
        type: "success",
        msg: `${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully!`,
      });
    }
    if (err) {
      setBanner({ type: "error", msg: decodeURIComponent(err) });
    }
    if (connected || err) {
      window.history.replaceState({}, "", "/dashboard/accounts");
      setTimeout(() => setBanner(null), 5000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeModal = () => {
    setModalOpen(false);
    setConnectForm({ type: "", handle: "", password: "", instance: "" });
  };

  const setOrigin = async (id: string) => {
    await api.post(`/accounts/origin/${id}`);
    fetchAccounts();
  };

  const toggleTarget = async (id: string, isTarget: boolean) => {
    const ids = accounts
      .filter((a) => (a.id === id ? !isTarget : a.isTarget))
      .map((a) => a.id);
    await api.post("/accounts/targets", { accountIds: ids });
    fetchAccounts();
  };

  const disconnect = async (id: string) => {
    await api.delete(`/accounts/${id}`);
    fetchAccounts();
  };

  const connectBluesky = async () => {
    setConnectLoading(true);
    try {
      await api.post("/accounts/connect/bluesky", {
        handle: connectForm.handle,
        appPassword: connectForm.password,
      });
      fetchAccounts();
      closeModal();
    } finally {
      setConnectLoading(false);
    }
  };

  const startOAuth = async (platform: string) => {
    try {
      let url: string;
      if (platform === "mastodon") {
        const res = await api.get(`/accounts/oauth/mastodon/start?instance=${connectForm.instance}`);
        url = res.data.authUrl;
      } else if (platform === "twitter") {
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
        const res = await api.get(`/accounts/oauth/meta/start?platform=${platform}`);
        url = res.data.authUrl;
      }
      if (!url) throw new Error(`No authUrl returned for ${platform}`);
      window.location.href = url;
    } catch (err: any) {
      console.error("OAuth start error:", err?.response?.data ?? err?.message);
      alert(`Failed to start ${platform} OAuth: ${err?.response?.data?.message ?? err?.message}`);
    }
  };

  const selected = CONNECT_OPTIONS.find((o) => o.id === connectForm.type);

  return (
    <Box sx={{ maxWidth: 860 }}>
      {/* Banner */}
      {banner && (
        <Alert
          severity={banner.type}
          onClose={() => setBanner(null)}
          sx={{ mb: 3, borderRadius: 1.5 }}
        >
          {banner.msg}
        </Alert>
      )}

      {/* Header */}
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            Accounts
          </Typography>
          <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
            Manage your connected social media platforms.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => setModalOpen(true)}
          sx={{ flexShrink: 0 }}
        >
          + Connect account
        </Button>
      </Stack>

      {/* Empty state */}
      {accounts.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            borderColor: "divider",
            borderRadius: 2,
            py: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <LinkRoundedIcon sx={{ fontSize: 40, color: "text.disabled" }} />
          <Typography sx={{ fontWeight: 600, color: "text.primary", fontSize: 15 }}>
            No accounts connected
          </Typography>
          <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
            Connect a platform to start broadcasting your posts.
          </Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Platform</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.map((account: any) => (
                <TableRow key={account.id} hover>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <PlatformLogo platform={account.platform} size={20} />
                      <Typography sx={{ fontWeight: 500, fontSize: 14 }}>
                        {account.platform}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                      @{account.platformUsername}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.75}>
                      {account.isOrigin && (
                        <Chip
                          label="Origin"
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 600, fontSize: 12 }}
                        />
                      )}
                      {account.isTarget && (
                        <Chip
                          label="Target"
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{ fontWeight: 600, fontSize: 12 }}
                        />
                      )}
                      {!account.isOrigin && !account.isTarget && (
                        <Typography sx={{ fontSize: 13, color: "text.secondary" }}>—</Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setOrigin(account.id)}
                        sx={{
                          fontSize: 12,
                          borderColor: account.isOrigin ? "primary.main" : "divider",
                          color: account.isOrigin ? "primary.main" : "text.secondary",
                        }}
                      >
                        {account.isOrigin ? "Origin ✓" : "Set as origin"}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => toggleTarget(account.id, account.isTarget)}
                        sx={{
                          fontSize: 12,
                          borderColor: account.isTarget ? "primary.main" : "divider",
                          color: account.isTarget ? "primary.main" : "text.secondary",
                        }}
                      >
                        {account.isTarget ? "Target ✓" : "Toggle target"}
                      </Button>
                      <Button
                        size="small"
                        onClick={() => disconnect(account.id)}
                        sx={(t: any) => ({
                          fontSize: 12,
                          color: "error.main",
                          "&:hover": { bgcolor: alpha(t.palette.error.main, 0.06) },
                        })}
                      >
                        Remove
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Connect Dialog */}
      <Dialog open={modalOpen} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>Connect a platform</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          {/* Platform picker grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1.5,
              mb: connectForm.type ? 3 : 0,
            }}
          >
            {CONNECT_OPTIONS.map((opt) => {
              const active = connectForm.type === opt.id;
              return (
                <Box
                  key={opt.id}
                  onClick={() =>
                    setConnectForm({ ...connectForm, type: opt.id })
                  }
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 2,
                    py: 1.5,
                    border: "1px solid",
                    borderColor: active ? "primary.main" : "divider",
                    borderRadius: 1.5,
                    bgcolor: active ? (t: any) => alpha(t.palette.text.primary, 0.04) : "transparent",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    "&:hover": {
                      borderColor: active ? "text.primary" : (t: any) => alpha(t.palette.text.primary, 0.3),
                      bgcolor: active ? (t: any) => alpha(t.palette.text.primary, 0.06) : (t: any) => alpha(t.palette.text.primary, 0.02),
                    },
                  }}
                >
                  <PlatformLogo platform={opt.id} size={20} />
                  <Typography sx={{ fontWeight: 500, fontSize: 14, color: "text.primary" }}>
                    {opt.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {/* BlueSky fields */}
          {connectForm.type === "bluesky" && (
            <Stack spacing={2}>
              <Divider sx={{ mb: 1 }} />
              <TextField
                label="BlueSky handle"
                size="small"
                fullWidth
                placeholder="you.bsky.social"
                value={connectForm.handle}
                onChange={(e) =>
                  setConnectForm({ ...connectForm, handle: e.target.value })
                }
              />
              <TextField
                label="App password"
                type="password"
                size="small"
                fullWidth
                placeholder="xxxx-xxxx-xxxx-xxxx"
                value={connectForm.password}
                onChange={(e) =>
                  setConnectForm({ ...connectForm, password: e.target.value })
                }
              />
            </Stack>
          )}

          {/* Mastodon fields */}
          {connectForm.type === "mastodon" && (
            <Stack spacing={2}>
              <Divider sx={{ mb: 1 }} />
              <TextField
                label="Your Mastodon instance"
                size="small"
                fullWidth
                placeholder="https://mastodon.social"
                value={connectForm.instance}
                onChange={(e) =>
                  setConnectForm({ ...connectForm, instance: e.target.value })
                }
              />
            </Stack>
          )}

          {/* OAuth platforms */}
          {connectForm.type &&
            !["bluesky", "mastodon"].includes(connectForm.type) && (
              <Box sx={{ mt: 1 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2 }}>
                  You'll be redirected to {selected?.label} to authorize
                  Relay. No passwords are stored.
                </Typography>
              </Box>
            )}
        </DialogContent>

        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeModal} sx={{ color: "text.secondary" }}>
            Cancel
          </Button>
          {connectForm.type === "bluesky" && (
            <Button
              variant="contained"
              disabled={connectLoading}
              onClick={connectBluesky}
              startIcon={connectLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
            >
              {connectLoading ? "Connecting…" : "Connect BlueSky"}
            </Button>
          )}
          {connectForm.type === "mastodon" && (
            <Button
              variant="contained"
              onClick={() => startOAuth("mastodon")}
            >
              Authorize with Mastodon
            </Button>
          )}
          {connectForm.type &&
            !["bluesky", "mastodon"].includes(connectForm.type) && (
              <Button
                variant="contained"
                onClick={() => startOAuth(connectForm.type)}
              >
                Authorize with {selected?.label}
              </Button>
            )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function AccountsPage() {
  return (
    <Suspense>
      <AccountsInner />
    </Suspense>
  );
}
