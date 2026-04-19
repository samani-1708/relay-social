import { createTheme } from "@mui/material/styles";

/* ── Light theme ──────────────────────────────────────────────────── */
export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#18181B",
      dark: "#09090B",
      light: "#52525B",
      contrastText: "#FFFFFF",
    },
    error:   { main: "#DC2626" },
    success: { main: "#16A34A" },
    warning: { main: "#D97706" },
    background: { default: "#FFFFFF", paper: "#FAFAFA" },
    text: { primary: "#09090B", secondary: "#71717A", disabled: "#A1A1AA" },
    divider: "#E4E4E7",
  },
  typography: {
    fontFamily: "var(--font-geist-sans), Inter, system-ui, sans-serif",
    h1: { fontWeight: 800, letterSpacing: "-0.03em" },
    h2: { fontWeight: 700, letterSpacing: "-0.025em" },
    h3: { fontWeight: 700, letterSpacing: "-0.02em" },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none" as const,
          fontWeight: 600,
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        },
        containedPrimary: {
          background: "#18181B",
          color: "#FFFFFF",
          "&:hover": { background: "#09090B" },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 500 } },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: "#FFFFFF" },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#FAFAFA",
          border: "1px solid #E4E4E7",
        },
        outlined: { border: "1px solid #E4E4E7" },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#FFFFFF",
          "& fieldset": { borderColor: "#E4E4E7" },
          "&:hover fieldset": { borderColor: "#A1A1AA" },
          "&.Mui-focused fieldset": { borderColor: "#18181B" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#FAFAFA",
          border: "1px solid #E4E4E7",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: "#E4E4E7" } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: "#71717A",
          backgroundColor: "#FAFAFA",
          borderBottom: "1px solid #E4E4E7",
        },
        body: { borderBottom: "1px solid #F4F4F5" },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { "&:hover": { backgroundColor: "#FAFAFA" } },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8 },
        standardError:   { backgroundColor: "#FEF2F2", border: "1px solid #FECACA" },
        standardSuccess: { backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { backgroundColor: "#E4E4E7", color: "#18181B" },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          "&.Mui-checked": { color: "#18181B" },
          "&.Mui-checked + .MuiSwitch-track": { backgroundColor: "#18181B" },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          borderBottom: "1px solid #E4E4E7",
          backgroundColor: "#FFFFFF",
        },
      },
    },
  },
});

/* ── Dark theme ───────────────────────────────────────────────────── */
export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#FAFAFA",
      dark: "#F4F4F5",
      light: "#D4D4D8",
      contrastText: "#09090B",
    },
    error:   { main: "#EF4444" },
    success: { main: "#22C55E" },
    warning: { main: "#F59E0B" },
    background: { default: "#09090B", paper: "#18181B" },
    text: { primary: "#FAFAFA", secondary: "#A1A1AA", disabled: "#52525B" },
    divider: "rgba(255,255,255,0.08)",
  },
  typography: {
    fontFamily: "var(--font-geist-sans), Inter, system-ui, sans-serif",
    h1: { fontWeight: 800, letterSpacing: "-0.03em" },
    h2: { fontWeight: 700, letterSpacing: "-0.025em" },
    h3: { fontWeight: 700, letterSpacing: "-0.02em" },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none" as const,
          fontWeight: 600,
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        },
        containedPrimary: {
          background: "#FAFAFA",
          color: "#09090B",
          "&:hover": { background: "#F4F4F5" },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
        outlinedPrimary: { borderColor: "rgba(255,255,255,0.25)", color: "#D4D4D8" },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#09090B",
          scrollbarColor: "#3F3F46 #09090B",
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-track": { background: "#09090B" },
          "&::-webkit-scrollbar-thumb": { background: "#3F3F46", borderRadius: 3 },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#18181B",
          border: "1px solid rgba(255,255,255,0.08)",
        },
        outlined: { border: "1px solid rgba(255,255,255,0.1)" },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#09090B",
          "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
          "&:hover fieldset": { borderColor: "rgba(255,255,255,0.25)" },
          "&.Mui-focused fieldset": { borderColor: "#FAFAFA" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#18181B",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: "rgba(255,255,255,0.08)" } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          color: "#A1A1AA",
          backgroundColor: "#09090B",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        },
        body: { borderBottom: "1px solid rgba(255,255,255,0.05)" },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { "&:hover": { backgroundColor: "rgba(255,255,255,0.03)" } },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8 },
        standardError:   { backgroundColor: "rgba(239,68,68,0.1)",  border: "1px solid rgba(239,68,68,0.2)" },
        standardSuccess: { backgroundColor: "rgba(34,197,94,0.1)",  border: "1px solid rgba(34,197,94,0.2)" },
      },
    },
    MuiAvatar: {
      styleOverrides: { root: { backgroundColor: "#3F3F46", color: "#FAFAFA" } },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          "&.Mui-checked": { color: "#FAFAFA" },
          "&.Mui-checked + .MuiSwitch-track": { backgroundColor: "#52525B" },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "#09090B",
        },
      },
    },
  },
});

export type ThemeMode = "light" | "dark";
