"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      localStorage.setItem("access_token", token);
      router.replace("/dashboard/settings");
    } else {
      router.replace("/auth/login?error=oauth_failed");
    }
  }, [params, router]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      }}
    >
      <CircularProgress size={28} color="primary" />
      <Typography sx={{ fontSize: 14, color: "text.secondary" }}>Signing you in…</Typography>
    </Box>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  );
}
