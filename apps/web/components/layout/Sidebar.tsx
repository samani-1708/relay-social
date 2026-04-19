"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Avatar from "@mui/material/Avatar";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { alpha } from "@mui/material/styles";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RelayLogo } from "@/components/RelayLogo";

const NAV_ITEMS = [
  { label: "Overview", icon: GridViewRoundedIcon, href: "/dashboard" },
  { label: "Accounts", icon: LinkRoundedIcon, href: "/dashboard/accounts" },
  { label: "Post history", icon: ArticleRoundedIcon, href: "/dashboard/posts" },
  { label: "Editor", icon: EditRoundedIcon, href: "/editor" },
  { label: "Settings", icon: SettingsRoundedIcon, href: "/dashboard/settings" },
];

interface Me {
  name?: string;
  email: string;
  avatar?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api.get("/auth/me").then((r) => setMe(r.data)).catch(() => {});
  }, []);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleSignOut = () => {
    localStorage.removeItem("access_token");
    router.replace("/auth/login");
  };

  return (
    <Box
      sx={{
        width: 220,
        flexShrink: 0,
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        bgcolor: "background.paper",
        borderRight: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <Box sx={{ px: 2.5, py: 2.5 }}>
        <RelayLogo variant="wordmark" size={28} />
      </Box>

      <Divider />

      {/* Nav items */}
      <Stack spacing={0.5} sx={{ px: 1.5, pt: 1.5, flex: 1 }}>
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const active = isActive(href);
          return (
            <Button
              key={href}
              startIcon={<Icon sx={{ fontSize: "18px !important" }} />}
              onClick={() => router.push(href)}
              fullWidth
              disableRipple={false}
              sx={{
                justifyContent: "flex-start",
                px: 1.5,
                py: 0.875,
                borderRadius: 1.5,
                fontWeight: active ? 600 : 500,
                fontSize: 14,
                bgcolor: active ? "primary.main" : "transparent",
                color: active ? "#fff" : "text.secondary",
                "&:hover": {
                  bgcolor: active ? "primary.dark" : (t) => alpha(t.palette.text.primary, 0.06),
                  color: active ? "primary.contrastText" : "text.primary",
                },
                "& .MuiButton-startIcon": {
                  color: "inherit",
                  marginRight: 1,
                },
                transition: "background-color 0.15s, color 0.15s",
              }}
            >
              {label}
            </Button>
          );
        })}
      </Stack>

      {/* Bottom: user + sign out */}
      <Box sx={{ px: 1.5, pb: 2 }}>
        <Divider sx={{ mb: 1.5 }} />

        {/* User profile row */}
        {me && (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.25}
            sx={{ px: 1.5, py: 1, mb: 0.5 }}
          >
            <Avatar
              src={me.avatar}
              alt={me.name ?? me.email}
              sx={{ width: 30, height: 30, fontSize: 13 }}
            >
              {(me.name ?? me.email)[0].toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              {me.name && (
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "text.primary",
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {me.name}
                </Typography>
              )}
              <Typography
                sx={{
                  fontSize: 11,
                  color: "text.secondary",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {me.email}
              </Typography>
            </Box>
          </Stack>
        )}

        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 0.5 }}>
          <ThemeToggle />
        </Box>

        <Button
          startIcon={<LogoutRoundedIcon sx={{ fontSize: "17px !important" }} />}
          onClick={handleSignOut}
          fullWidth
          sx={{
            justifyContent: "flex-start",
            px: 1.5,
            py: 0.875,
            borderRadius: 1.5,
            fontWeight: 500,
            fontSize: 14,
            color: "text.secondary",
            bgcolor: "transparent",
            "&:hover": {
              bgcolor: (t) => alpha(t.palette.error.main, 0.08),
              color: "error.main",
            },
            "& .MuiButton-startIcon": { marginRight: 1, color: "inherit" },
            transition: "background-color 0.15s, color 0.15s",
          }}
        >
          Sign out
        </Button>
      </Box>
    </Box>
  );
}
