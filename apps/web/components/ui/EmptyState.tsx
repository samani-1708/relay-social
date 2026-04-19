"use client";

/**
 * EmptyState — zero-data placeholder with icon, title, and optional action.
 *
 * Usage:
 *   <EmptyState
 *     icon="📭"
 *     title="No posts yet"
 *     description="Publish something from the editor."
 *     action={<Button onClick={...}>New post</Button>}
 *   />
 */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        px: 2,
        textAlign: "center",
        gap: 1.5,
      }}
    >
      {icon && (
        <Typography variant="h3" sx={{ lineHeight: 1, mb: 0.5 }}>
          {icon}
        </Typography>
      )}
      <Typography variant="h6" fontWeight={600}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" maxWidth={360}>
          {description}
        </Typography>
      )}
      {action && <Box mt={1}>{action}</Box>}
    </Box>
  );
}
