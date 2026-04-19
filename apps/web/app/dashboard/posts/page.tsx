"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Collapse from "@mui/material/Collapse";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import { api } from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const IN_FLIGHT = new Set(["PENDING", "PROCESSING", "QUEUED"]);

type ChipColor = "success" | "error" | "warning" | "default";

const STATUS_COLOR: Record<string, ChipColor> = {
  SENT: "success",
  DONE: "success",
  FAILED: "error",
  PENDING: "warning",
  QUEUED: "warning",
  PROCESSING: "warning",
  SKIPPED: "default",
};

const PLATFORM_LABEL: Record<string, string> = {
  TWITTER: "Twitter / X",
  BLUESKY: "Bluesky",
  THREADS: "Threads",
  LINKEDIN: "LinkedIn",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  MASTODON: "Mastodon",
  SHARECHAT: "ShareChat",
  YOUTUBE: "YouTube",
  TIKTOK: "TikTok",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface TargetAccount {
  platformUsername: string;
  instanceUrl?: string | null;
}

interface BroadcastJob {
  id: string;
  targetPlatform: string;
  status: string;
  sentAt?: string;
  errorMessage?: string;
  sentPostIds: string[];
  targetAccount: TargetAccount;
}

interface BroadcastJobDetail extends BroadcastJob {
  adaptedContent?: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Post {
  id: string;
  originContent: string;
  originPlatform: string;
  status: string;
  source?: string;
  createdAt: string;
  broadcastJobs: BroadcastJob[];
}

interface PostDetail extends Omit<Post, "broadcastJobs"> {
  broadcastJobs: BroadcastJobDetail[];
}

interface PostsData {
  posts: Post[];
  total: number;
  page: number;
  pages: number;
}

interface Analytics {
  totalPosts: number;
  recentPosts30d: number;
  recentPosts7d: number;
  totalBroadcasts: number;
  sentCount: number;
  failedCount: number;
  successRate: number;
  platformBreakdown: { platform: string; count: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPostUrl(
  platform: string,
  sentPostId: string,
  handle: string,
  instanceUrl?: string | null,
): string | null {
  switch (platform) {
    case "TWITTER":
      return `https://x.com/${handle}/status/${sentPostId}`;
    case "BLUESKY":
      return `https://bsky.app/profile/${handle}/post/${sentPostId}`;
    case "LINKEDIN":
      return `https://www.linkedin.com/feed/update/${sentPostId}`;
    case "THREADS":
      return `https://www.threads.net/@${handle}/post/${sentPostId}`;
    case "MASTODON":
      return instanceUrl ? `${instanceUrl}/@${handle}/${sentPostId}` : null;
    case "FACEBOOK":
      return `https://www.facebook.com/${sentPostId}`;
    case "YOUTUBE":
      return `https://www.youtube.com/watch?v=${sentPostId}`;
    case "TIKTOK":
      return `https://www.tiktok.com/@${handle}/video/${sentPostId}`;
    default:
      return null;
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hasInFlight(posts: Post[]) {
  return posts.some(
    (p) =>
      IN_FLIGHT.has(p.status) ||
      p.broadcastJobs.some((j) => IN_FLIGHT.has(j.status)),
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color = "primary.main",
}: StatCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{ borderColor: "divider", borderRadius: 2, p: 2.5, height: "100%" }}
    >
      <Stack
        direction="column"
        alignItems="flex-start"
        justifyContent="space-between"
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography
            sx={{
              fontSize: 12,
              color: "text.secondary",
              mb: 0.5,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {label}
          </Typography>
          <Box sx={{ color }}>{icon}</Box>
        </Stack>
        <Stack direction="column" alignItems="center" spacing={1}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, lineHeight: 1, color }}
          >
            {value}
          </Typography>
          {sub && (
            <Typography
              sx={{ fontSize: 12, color: "text.secondary", mt: 0.75 }}
            >
              {sub}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

// ─── Analytics summary section ────────────────────────────────────────────────

function AnalyticsSummary({ data }: { data: Analytics }) {
  const uniquePlatforms = data.platformBreakdown.length;

  return (
    <Box sx={{ mb: 5 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <BarChartRoundedIcon sx={{ fontSize: 18, color: "primary.main" }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Your reach
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2.5 }}>
        Content amplification and delivery metrics since you joined.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<TrendingUpRoundedIcon />}
            label="Posts broadcast"
            value={data.totalPosts}
            sub={`${data.recentPosts7d} this week`}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<CheckCircleRoundedIcon />}
            label="Success rate"
            value={`${data.successRate}%`}
            sub={`${data.sentCount} of ${data.totalBroadcasts} delivered`}
            color={
              data.successRate >= 80
                ? "success.main"
                : data.successRate >= 50
                  ? "warning.main"
                  : "error.main"
            }
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<HubRoundedIcon />}
            label="Platforms reached"
            value={uniquePlatforms}
            sub={
              data.platformBreakdown
                .slice(0, 2)
                .map((p) => PLATFORM_LABEL[p.platform] ?? p.platform)
                .join(", ") || "None yet"
            }
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<CalendarMonthRoundedIcon />}
            label="Last 30 days"
            value={data.recentPosts30d}
            sub={`${data.recentPosts7d} in last 7 days`}
          />
        </Grid>
      </Grid>

      {/* Platform breakdown bar */}
      {data.platformBreakdown.length > 0 && (
        <Paper
          variant="outlined"
          sx={{ borderColor: "divider", borderRadius: 2, p: 2 }}
        >
          <Typography
            sx={{
              fontSize: 12,
              color: "text.secondary",
              mb: 1.5,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Deliveries per platform
          </Typography>
          <Stack spacing={1}>
            {data.platformBreakdown.map(({ platform, count }) => {
              const pct =
                data.sentCount > 0
                  ? Math.round((count / data.sentCount) * 100)
                  : 0;
              return (
                <Stack
                  key={platform}
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                >
                  <Typography
                    sx={{
                      fontSize: 12,
                      width: 90,
                      flexShrink: 0,
                      color: "text.secondary",
                    }}
                  >
                    {PLATFORM_LABEL[platform] ?? platform}
                  </Typography>
                  <Box
                    sx={{
                      flex: 1,
                      height: 6,
                      bgcolor: "action.hover",
                      borderRadius: 99,
                    }}
                  >
                    <Box
                      sx={{
                        width: `${pct}%`,
                        height: "100%",
                        bgcolor: "primary.main",
                        borderRadius: 99,
                        transition: "width 0.6s ease",
                      }}
                    />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: "text.secondary",
                      width: 32,
                      textAlign: "right",
                    }}
                  >
                    {count}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </Paper>
      )}
    </Box>
  );
}

// ─── Accordion detail panel ───────────────────────────────────────────────────

interface DetailPanelProps {
  post: Post;
  detail: PostDetail | null;
  loadingDetail: boolean;
  onLoadDetail: () => void;
}

function DetailPanel({
  post,
  detail,
  loadingDetail,
  onLoadDetail,
}: DetailPanelProps) {
  const jobs = detail?.broadcastJobs ?? post.broadcastJobs;

  return (
    <Box sx={{ py: 2, px: 3 }}>
      {/* Per-platform job cards */}
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 600,
          color: "text.secondary",
          mb: 1.5,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        Broadcast targets
      </Typography>

      {jobs.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: "text.disabled" }}>
          No broadcast jobs.
        </Typography>
      ) : (
        <Stack spacing={1.5} sx={{ mb: 2.5 }}>
          {jobs.map((job) => {
            const url =
              job.sentPostIds.length > 0
                ? buildPostUrl(
                    job.targetPlatform,
                    job.sentPostIds[0],
                    job.targetAccount?.platformUsername ?? "",
                    job.targetAccount?.instanceUrl,
                  )
                : null;

            const detailJob = detail?.broadcastJobs.find(
              (j) => j.id === job.id,
            );

            return (
              <Paper
                key={job.id}
                variant="outlined"
                sx={{ borderColor: "divider", borderRadius: 1.5, p: 1.75 }}
              >
                <Stack
                  direction="row"
                  alignItems="flex-start"
                  justifyContent="space-between"
                  flexWrap="wrap"
                  gap={1}
                >
                  {/* Left: platform + account + status */}
                  <Stack spacing={0.5}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Chip
                        label={
                          PLATFORM_LABEL[job.targetPlatform] ??
                          job.targetPlatform
                        }
                        size="small"
                        color={STATUS_COLOR[job.status] ?? "default"}
                        sx={{ fontSize: 11, fontWeight: 600 }}
                      />
                      {job.targetAccount?.platformUsername && (
                        <Typography
                          sx={{ fontSize: 12, color: "text.secondary" }}
                        >
                          @{job.targetAccount.platformUsername}
                        </Typography>
                      )}
                    </Stack>

                    {job.sentAt && (
                      <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                        Sent {fmtDate(job.sentAt)} at {fmtTime(job.sentAt)}
                      </Typography>
                    )}

                    {job.errorMessage && (
                      <Typography
                        sx={{
                          fontSize: 11,
                          color: "error.main",
                          maxWidth: 480,
                        }}
                      >
                        {job.errorMessage}
                      </Typography>
                    )}

                    {/* Adapted content — only when detail is loaded */}
                    {detailJob?.adaptedContent && (
                      <Box sx={{ mt: 0.75 }}>
                        <Typography
                          sx={{
                            fontSize: 11,
                            color: "text.secondary",
                            mb: 0.25,
                          }}
                        >
                          Adapted content:
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: "text.primary",
                            bgcolor: "action.hover",
                            borderRadius: 1,
                            px: 1.25,
                            py: 0.75,
                            maxWidth: 520,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {detailJob.adaptedContent}
                        </Typography>
                      </Box>
                    )}

                    {detailJob && (
                      <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                        {detailJob.retryCount > 0 &&
                          `${detailJob.retryCount} retr${detailJob.retryCount === 1 ? "y" : "ies"} · `}
                        Last updated {fmtDate(detailJob.updatedAt)}
                      </Typography>
                    )}
                  </Stack>

                  {/* Right: link to post */}
                  {url ? (
                    <Tooltip
                      title={`Open on ${PLATFORM_LABEL[job.targetPlatform] ?? job.targetPlatform}`}
                    >
                      <Button
                        component="a"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small"
                        endIcon={
                          <OpenInNewRoundedIcon
                            sx={{ fontSize: "14px !important" }}
                          />
                        }
                        sx={{
                          fontSize: 12,
                          textTransform: "none",
                          flexShrink: 0,
                        }}
                      >
                        View post
                      </Button>
                    </Tooltip>
                  ) : job.sentPostIds.length > 0 ? (
                    <Typography sx={{ fontSize: 11, color: "text.disabled" }}>
                      ID: {job.sentPostIds[0]}
                    </Typography>
                  ) : null}
                </Stack>

                {/* Thread IDs when a post became multiple replies */}
                {job.sentPostIds.length > 1 && (
                  <Box sx={{ mt: 1, pl: 0.5 }}>
                    <Typography
                      sx={{ fontSize: 11, color: "text.secondary", mb: 0.5 }}
                    >
                      Thread ({job.sentPostIds.length} parts):
                    </Typography>
                    <Stack spacing={0.25}>
                      {job.sentPostIds.map((pid, i) => {
                        const partUrl = buildPostUrl(
                          job.targetPlatform,
                          pid,
                          job.targetAccount?.platformUsername ?? "",
                          job.targetAccount?.instanceUrl,
                        );
                        return (
                          <Typography
                            key={pid}
                            sx={{ fontSize: 11, color: "text.secondary" }}
                          >
                            Part {i + 1}:{" "}
                            {partUrl ? (
                              <Box
                                component="a"
                                href={partUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{
                                  color: "primary.main",
                                  textDecoration: "none",
                                  "&:hover": { textDecoration: "underline" },
                                }}
                              >
                                {pid}
                              </Box>
                            ) : (
                              pid
                            )}
                          </Typography>
                        );
                      })}
                    </Stack>
                  </Box>
                )}
              </Paper>
            );
          })}
        </Stack>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Show more detail button */}
      {!detail ? (
        <Button
          size="small"
          variant="outlined"
          onClick={onLoadDetail}
          disabled={loadingDetail}
          startIcon={loadingDetail ? <CircularProgress size={13} /> : undefined}
          sx={{
            fontSize: 12,
            textTransform: "none",
            borderColor: "divider",
            color: "text.secondary",
          }}
        >
          {loadingDetail ? "Loading detail…" : "Show more detail"}
        </Button>
      ) : (
        <Typography sx={{ fontSize: 12, color: "text.disabled" }}>
          Showing full detail · adapted content and retry history loaded
        </Typography>
      )}
    </Box>
  );
}

// ─── Post row ─────────────────────────────────────────────────────────────────

interface PostRowProps {
  post: Post;
  expanded: boolean;
  onToggle: () => void;
  detail: PostDetail | null;
  loadingDetail: boolean;
  onLoadDetail: () => void;
}

function PostRow({
  post,
  expanded,
  onToggle,
  detail,
  loadingDetail,
  onLoadDetail,
}: PostRowProps) {
  return (
    <>
      <TableRow
        hover
        onClick={onToggle}
        sx={{
          cursor: "pointer",
          "& td": { borderBottom: expanded ? "none" : undefined },
        }}
      >
        {/* Content */}
        <TableCell sx={{ maxWidth: 280 }}>
          <Typography
            sx={{
              fontSize: 13,
              color: "text.primary",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              lineHeight: 1.5,
            }}
          >
            {post.originContent}
          </Typography>
        </TableCell>

        {/* Source */}
        <TableCell>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
            {post.source === "editor"
              ? "Editor"
              : (PLATFORM_LABEL[post.originPlatform] ?? post.originPlatform)}
          </Typography>
        </TableCell>

        {/* Overall status */}
        <TableCell>
          <Chip
            label={post.status}
            size="small"
            color={STATUS_COLOR[post.status] ?? "default"}
            sx={{ fontSize: 11, fontWeight: 600 }}
          />
        </TableCell>

        {/* Per-platform chips */}
        <TableCell>
          <Stack direction="row" flexWrap="wrap" gap={0.75}>
            {post.broadcastJobs.map((job) => (
              <Tooltip key={job.id} title={job.errorMessage ?? job.status}>
                <Chip
                  label={job.targetPlatform}
                  size="small"
                  color={STATUS_COLOR[job.status] ?? "default"}
                  sx={{ fontSize: 11, fontWeight: 500 }}
                />
              </Tooltip>
            ))}
            {post.broadcastJobs.length === 0 && (
              <Typography sx={{ fontSize: 12, color: "text.disabled" }}>
                —
              </Typography>
            )}
          </Stack>
        </TableCell>

        {/* Date */}
        <TableCell>
          <Typography
            sx={{ fontSize: 12, color: "text.secondary", whiteSpace: "nowrap" }}
          >
            {fmtDate(post.createdAt)}
          </Typography>
        </TableCell>

        {/* Expand toggle */}
        <TableCell sx={{ width: 40, pr: 1 }}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {expanded ? (
              <KeyboardArrowUpRoundedIcon fontSize="small" />
            ) : (
              <KeyboardArrowDownRoundedIcon fontSize="small" />
            )}
          </IconButton>
        </TableCell>
      </TableRow>

      {/* Accordion row */}
      <TableRow sx={{ "& td": { pt: 0 } }}>
        <TableCell
          colSpan={6}
          sx={{ pb: 0, borderBottom: expanded ? undefined : "none" }}
        >
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <DetailPanel
              post={post}
              detail={detail}
              loadingDetail={loadingDetail}
              onLoadDetail={onLoadDetail}
            />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PostsPage() {
  const [data, setData] = useState<PostsData>({
    posts: [],
    total: 0,
    page: 1,
    pages: 1,
  });
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  // Accordion state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [postDetails, setPostDetails] = useState<Record<string, PostDetail>>(
    {},
  );
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPosts = async (p: number): Promise<PostsData> => {
    const r = await api.get(`/posts?page=${p}&limit=20`);
    setData(r.data);
    setPage(p);
    return r.data;
  };

  const fetchAnalytics = async () => {
    try {
      const r = await api.get("/posts/analytics");
      setAnalytics(r.data);
    } catch {
      // non-critical — don't surface to user
    }
  };

  const schedulePoll = (posts: Post[], currentPage: number) => {
    if (pollRef.current) clearTimeout(pollRef.current);
    if (!hasInFlight(posts)) return;
    pollRef.current = setTimeout(async () => {
      const fresh = await fetchPosts(currentPage).catch(() => null);
      if (fresh) schedulePoll(fresh.posts, currentPage);
    }, 4000);
  };

  const loadPage = async (p: number) => {
    const fresh = await fetchPosts(p);
    schedulePoll(fresh.posts, p);
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadPage(page), fetchAnalytics()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggle = (postId: string) => {
    setExpandedId((prev) => (prev === postId ? null : postId));
  };

  const handleLoadDetail = async (postId: string) => {
    if (postDetails[postId] || loadingDetailId === postId) return;
    setLoadingDetailId(postId);
    try {
      const r = await api.get(`/posts/${postId}`);
      setPostDetails((prev) => ({ ...prev, [postId]: r.data }));
    } finally {
      setLoadingDetailId(null);
    }
  };

  useEffect(() => {
    loadPage(1);
    fetchAnalytics();
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ maxWidth: 1020 }}>
      {/* Header */}
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            Post history
          </Typography>
          <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
            All posts and their broadcast status across every target platform.
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={refresh} disabled={refreshing} size="small">
            <RefreshRoundedIcon
              fontSize="small"
              sx={{
                animation: refreshing ? "spin 1s linear infinite" : "none",
                "@keyframes spin": {
                  from: { transform: "rotate(0deg)" },
                  to: { transform: "rotate(360deg)" },
                },
              }}
            />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Analytics summary */}
      {analytics && <AnalyticsSummary data={analytics} />}

      {/* Empty state */}
      {data.posts.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            borderColor: "divider",
            borderRadius: 2,
            py: 12,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <ArticleRoundedIcon sx={{ fontSize: 40, color: "text.disabled" }} />
          <Typography
            sx={{ fontWeight: 600, color: "text.primary", fontSize: 15 }}
          >
            No posts yet
          </Typography>
          <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
            Posts from your origin platform will appear here.
          </Typography>
        </Paper>
      ) : (
        <>
          <Paper
            variant="outlined"
            sx={{
              borderColor: "divider",
              borderRadius: 2,
              overflow: "hidden",
              mb: 3,
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 200 }}>Content</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Platforms</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell sx={{ width: 40 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {data.posts.map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    expanded={expandedId === post.id}
                    onToggle={() => handleToggle(post.id)}
                    detail={postDetails[post.id] ?? null}
                    loadingDetail={loadingDetailId === post.id}
                    onLoadDetail={() => handleLoadDetail(post.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </Paper>

          {/* Pagination */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              {data.total} total posts
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Button
                size="small"
                variant="outlined"
                disabled={page <= 1}
                onClick={() => loadPage(page - 1)}
                sx={{
                  borderColor: "divider",
                  color: "text.secondary",
                  fontSize: 13,
                }}
              >
                Previous
              </Button>
              <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                {page} of {data.pages}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                disabled={page >= data.pages}
                onClick={() => loadPage(page + 1)}
                sx={{
                  borderColor: "divider",
                  color: "text.secondary",
                  fontSize: 13,
                }}
              >
                Next
              </Button>
            </Stack>
          </Stack>
        </>
      )}
    </Box>
  );
}
