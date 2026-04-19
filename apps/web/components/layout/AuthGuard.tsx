"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    // Verify the token is still valid server-side, not just present in storage.
    // This catches expired JWTs and deleted/deactivated accounts.
    api
      .get("/auth/me")
      .then(() => setReady(true))
      .catch((err) => {
        // Only log out on 401 (token invalid/expired). Network errors or 5xx
        // from a restarting API should not clear a valid token.
        if (err?.response?.status === 401) {
          localStorage.removeItem("access_token");
          router.replace("/auth/login");
        } else {
          // API temporarily unreachable — still let the user in, pages will
          // show their own loading/error states when they hit the API.
          setReady(true);
        }
      });
  }, [router]);

  if (!ready) return null;
  return <>{children}</>;
}
