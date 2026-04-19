"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import { api } from "@/lib/api";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Sidebar } from "@/components/layout/Sidebar";
import { PlatformLogo } from "@/components/PlatformLogo";

const PLATFORM_LIMITS: Record<string, number> = {
  X:        280,
  BLUESKY:  300,
  THREADS:  500,
  MASTODON: 500,
  LINKEDIN: 3000,
  YOUTUBE:  5000,
  TIKTOK:   2200,
};

interface PreviewChunk {
  text: string;
}

interface Preview {
  platform: string;
  chunks: PreviewChunk[];
}

export default function EditorPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const updatePreview = useCallback(async (text: string) => {
    if (!text.trim()) {
      setPreviews([]);
      return;
    }
    try {
      const { data } = await api.post("/editor/preview", { content: text });
      setPreviews(data.previews ?? []);
    } catch {
      // silently fail preview updates
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    updatePreview(val);
  };

  const publish = async () => {
    if (!content.trim() || publishing) return;
    setPublishing(true);
    try {
      await api.post("/editor/publish", { content });
      setPublished(true);
      setContent("");
      setPreviews([]);
      // Navigate to posts page so user can see the broadcast result
      setTimeout(() => router.push("/dashboard/posts"), 1000);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AuthGuard>
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Sidebar />

      <Box
        component="main"
        sx={{ flex: 1, ml: "220px", p: 4, display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          sx={{ mb: 4 }}
        >
          <Box>
            <Typography variant="h5" sx={{ mb: 0.5 }}>
              Editor
            </Typography>
            <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
              Compose a post and see live previews across all platforms.
            </Typography>
          </Box>
          <Button
            variant="contained"
            disabled={publishing || !content.trim()}
            onClick={publish}
            sx={{ flexShrink: 0, fontWeight: 600, px: 3 }}
            startIcon={
              publishing ? <CircularProgress size={14} color="inherit" /> : undefined
            }
          >
            {published ? "Published ✓" : publishing ? "Broadcasting…" : "Broadcast"}
          </Button>
        </Stack>

        {/* Split layout */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            gap: 3,
            flex: 1,
          }}
        >
          {/* Left: Compose */}
          <Stack spacing={3}>
            {/* Textarea */}
            <Paper
              variant="outlined"
              sx={{ borderColor: "divider", borderRadius: 2, overflow: "hidden" }}
            >
              <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
                <Typography sx={{ fontWeight: 600, fontSize: 13, color: "text.secondary" }}>
                  COMPOSE
                </Typography>
              </Box>
              <Box sx={{ p: 2.5 }}>
                <TextField
                  multiline
                  minRows={10}
                  fullWidth
                  variant="outlined"
                  placeholder="What do you want to share?"
                  value={content}
                  onChange={handleChange}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      fontSize: 15,
                      lineHeight: 1.65,
                      "& fieldset": { border: "none" },
                    },
                    "& .MuiOutlinedInput-input": { p: 0 },
                  }}
                />
              </Box>
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  borderTop: "1px solid",
                  borderColor: "divider",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  {content.length} characters
                </Typography>
              </Box>
            </Paper>

            {/* Character limits */}
            {content.length > 0 && (
              <Paper
                variant="outlined"
                sx={{ borderColor: "divider", borderRadius: 2, overflow: "hidden" }}
              >
                <Box
                  sx={{ px: 2.5, py: 2, borderBottom: "1px solid", borderColor: "divider" }}
                >
                  <Typography
                    sx={{ fontWeight: 600, fontSize: 13, color: "text.secondary" }}
                  >
                    CHARACTER LIMITS
                  </Typography>
                </Box>
                <Stack spacing={2} sx={{ px: 2.5, py: 2.5 }}>
                  {Object.entries(PLATFORM_LIMITS).map(([platform, limit]) => {
                    const count = content.length;
                    const over = count > limit;
                    const pct = Math.min((count / limit) * 100, 100);
                    const barColor = over
                      ? "error.main"
                      : pct > 80
                      ? "warning.main"
                      : "primary.main";

                    return (
                      <Stack key={platform} direction="row" alignItems="center" spacing={1.5}>
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.75}
                          sx={{ width: 110, flexShrink: 0 }}
                        >
                          <PlatformLogo platform={platform} size={14} />
                          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                            {platform}
                          </Typography>
                        </Stack>
                        <Box
                          sx={{
                            flex: 1,
                            height: 4,
                            borderRadius: 99,
                            bgcolor: (t: any) => t.palette.divider,
                            overflow: "hidden",
                          }}
                        >
                          <Box
                            sx={{
                              height: "100%",
                              width: `${pct}%`,
                              bgcolor: barColor,
                              borderRadius: 99,
                              transition: "width 0.2s",
                            }}
                          />
                        </Box>
                        <Typography
                          sx={{
                            fontSize: 11,
                            color: over ? "error.main" : "text.secondary",
                            fontVariantNumeric: "tabular-nums",
                            width: 64,
                            textAlign: "right",
                            flexShrink: 0,
                          }}
                        >
                          {count}/{limit}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              </Paper>
            )}
          </Stack>

          {/* Right: Live previews */}
          <Stack spacing={2.5}>
            <Typography
              sx={{ fontWeight: 600, fontSize: 13, color: "text.secondary" }}
            >
              LIVE PREVIEWS
            </Typography>

            {previews.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  borderColor: "divider",
                  borderRadius: 2,
                  py: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography sx={{ fontSize: 14, color: "text.disabled" }}>
                  Start typing to see previews
                </Typography>
              </Paper>
            ) : (
              previews.map((p) => (
                <Paper
                  key={p.platform}
                  variant="outlined"
                  sx={{ borderColor: "divider", borderRadius: 2, overflow: "hidden" }}
                >
                  <Box
                    sx={{
                      px: 2.5,
                      py: 1.75,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                    }}
                  >
                    <PlatformLogo platform={p.platform} size={18} />
                    <Typography sx={{ fontWeight: 600, fontSize: 13, color: "text.secondary" }}>
                      {p.platform}
                    </Typography>
                    {p.chunks.length > 1 && (
                      <Chip
                        label={`${p.chunks.length}-part thread`}
                        size="small"
                        color="warning"
                        sx={{ fontSize: 11, fontWeight: 600, ml: "auto" }}
                      />
                    )}
                  </Box>
                  <Stack spacing={0} sx={{ px: 2.5, py: 2 }}>
                    {p.chunks.map((chunk, i) => (
                      <Box key={i}>
                        {i > 0 && <Divider sx={{ my: 1.5 }} />}
                        {p.chunks.length > 1 && (
                          <Typography
                            sx={{
                              fontSize: 11,
                              color: "text.secondary",
                              mb: 0.5,
                              fontWeight: 600,
                            }}
                          >
                            Part {i + 1}
                          </Typography>
                        )}
                        <Typography
                          sx={{ fontSize: 14, color: "text.primary", lineHeight: 1.65 }}
                        >
                          {chunk.text}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              ))
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
    </AuthGuard>
  );
}
