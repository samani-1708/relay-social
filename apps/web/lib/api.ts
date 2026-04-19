import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api",
});

api.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// When the server returns 401 (expired/invalid JWT), clear the token and send
// the user back to login. Without this, expired tokens cause silent API failures.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      typeof window !== "undefined" &&
      error?.response?.status === 401
    ) {
      localStorage.removeItem("access_token");
      window.location.replace("/auth/login");
    }
    return Promise.reject(error);
  },
);
