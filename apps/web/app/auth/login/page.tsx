"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RelayLogo } from "@/components/RelayLogo";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

function LoginContent() {
  const params = useSearchParams();
  const oauthError = params.get("error") === "oauth_failed";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        position: "relative",
      }}
    >
      {/* Theme toggle */}
      <Box sx={{ position: "absolute", top: 16, right: 16 }}>
        <ThemeToggle />
      </Box>

      {/* Subtle grid background */}
      <Box
        sx={(t) => ({
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(${alpha(t.palette.text.primary, 0.04)} 1px, transparent 1px),
            linear-gradient(90deg, ${alpha(t.palette.text.primary, 0.04)} 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
          pointerEvents: "none",
        })}
      />

      <Box sx={{ width: "100%", maxWidth: 380, position: "relative" }}>
        {/* Logo */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 6 }}>
          <RelayLogo variant="wordmark" size={36} />
        </Box>

        <Box
          sx={(t) => ({
            p: 4,
            borderRadius: 2.5,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            boxShadow: `0 8px 40px ${alpha(t.palette.common.black, 0.08)}`,
          })}
        >
          <Typography
            variant="h5"
            sx={{ mb: 0.75, textAlign: "center", fontWeight: 700 }}
          >
            Welcome back
          </Typography>
          <Typography
            sx={{
              fontSize: 14,
              color: "text.secondary",
              textAlign: "center",
              mb: 4,
            }}
          >
            Sign in or create your account
          </Typography>

          {oauthError && (
            <Alert severity="error" sx={{ mb: 3, fontSize: 13 }}>
              Sign-in failed. Please try again.
            </Alert>
          )}

          <Button
            component="a"
            href={`${API_URL}/auth/google`}
            variant="outlined"
            fullWidth
            startIcon={<GoogleIcon />}
            sx={(t) => ({
              py: 1.5,
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 2,
              borderColor: "divider",
              color: "text.primary",
              bgcolor: "transparent",
              "&:hover": {
                borderColor: alpha(t.palette.text.primary, 0.35),
                bgcolor: alpha(t.palette.text.primary, 0.04),
              },
            })}
          >
            Continue with Google
          </Button>

          <Typography
            sx={{
              fontSize: 12,
              color: "text.disabled",
              textAlign: "center",
              mt: 3,
              lineHeight: 1.7,
            }}
          >
            By continuing you agree to Relay&apos;s terms.
            <br />
            No password required.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
