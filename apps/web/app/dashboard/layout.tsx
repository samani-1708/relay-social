/**
 * Dashboard layout.
 *
 * Auth protection is handled by middleware.ts (runs at the edge before this
 * layout is rendered). No client-side <AuthGuard> needed here.
 */
import { Sidebar } from "@/components/layout/Sidebar";
import Box from "@mui/material/Box";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flex: 1,
          ml: "220px",
          bgcolor: "background.default",
          minHeight: "100vh",
          p: 4,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
