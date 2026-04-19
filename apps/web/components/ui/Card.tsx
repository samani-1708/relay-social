"use client";

/**
 * relayman Card — consistent section card with optional header.
 *
 * Usage:
 *   <Card title="Broadcasting">
 *     <p>content</p>
 *   </Card>
 *
 *   <Card>
 *     <p>no header</p>
 *   </Card>
 */

import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import { SxProps, Theme } from "@mui/material/styles";

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Override inner padding (default: 3) */
  padding?: number;
  sx?: SxProps<Theme>;
  headerAction?: React.ReactNode;
}

export function Card({ title, subtitle, children, padding = 3, sx, headerAction }: CardProps) {
  return (
    <Paper
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        ...sx,
      }}
    >
      {title && (
        <>
          <Box
            sx={{
              px: padding,
              pt: padding,
              pb: subtitle ? 0.5 : padding,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary" mt={0.25}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            {headerAction}
          </Box>
          <Divider sx={{ mt: 2 }} />
        </>
      )}
      <Box sx={{ p: padding }}>{children}</Box>
    </Paper>
  );
}
