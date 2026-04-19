"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import { api } from "@/lib/api";
import { PlatformLogo } from "@/components/PlatformLogo";

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

export default function DashboardPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    api.get("/posts?limit=5").then((r) => setPosts(r.data.posts ?? []));
    api.get("/accounts").then((r) => setAccounts(r.data));
  }, []);

  const origin = accounts.find((a) => a.isOrigin);
  const targets = accounts.filter((a) => a.isTarget);

  const stats = [
    {
      label: "Origin platform",
      value: origin ? `@${origin.platformUsername}` : "—",
      sub: origin ? origin.platform : "Not set",
    },
    {
      label: "Target platforms",
      value: targets.length,
      sub: targets.map((t) => t.platform).join(", ") || "None selected",
    },
    {
      label: "Total accounts",
      value: accounts.length,
      sub: "Connected",
    },
  ];

  return (
    <Box sx={{ maxWidth: 860 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 0.5 }}>
          Overview
        </Typography>
        <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
          Your broadcasting hub — connected accounts and recent activity.
        </Typography>
      </Box>

      {/* Stats */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 2.5,
          mb: 4,
        }}
      >
        {stats.map((stat) => (
          <Paper
            key={stat.label}
            variant="outlined"
            sx={{ borderColor: "divider", borderRadius: 2, p: 3 }}
          >
            <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1, fontWeight: 500 }}>
              {stat.label.toUpperCase()}
            </Typography>
            <Typography sx={{ fontSize: 22, fontWeight: 700, color: "text.primary", mb: 0.5 }}>
              {stat.value}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }} noWrap>
              {stat.sub}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Recent posts */}
      <Typography sx={{ fontWeight: 600, fontSize: 13, color: "text.secondary", mb: 2 }}>
        RECENT POSTS
      </Typography>

      {posts.length === 0 ? (
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
            No posts yet. Connect an origin platform to get started.
          </Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 200 }}>Content</TableCell>
                <TableCell>Origin</TableCell>
                <TableCell>Platforms</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {posts.map((post: any) => (
                <TableRow key={post.id} hover>
                  <TableCell sx={{ maxWidth: 300 }}>
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
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <PlatformLogo platform={post.originPlatform} size={16} />
                      <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                        {post.originPlatform}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" flexWrap="wrap" gap={0.75}>
                      {post.broadcastJobs?.map((job: any) => (
                        <Chip
                          key={job.id}
                          label={job.targetPlatform}
                          size="small"
                          color={STATUS_COLOR[job.status] ?? "default"}
                          title={job.errorMessage ?? ""}
                          sx={{ fontSize: 11, fontWeight: 500 }}
                        />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 12, color: "text.secondary", whiteSpace: "nowrap" }}>
                      {new Date(post.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
