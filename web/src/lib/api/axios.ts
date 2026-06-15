import { useAuthStore } from "@/lib/store/authStore";
import axios from "axios";

/**
 * api — the single Axios instance for all Smart Wardrobe API calls.
 *
 * REQUEST INTERCEPTOR
 *   Reads the Bearer token from Zustand's authStore via .getState()
 *   (safe to call outside React components) and attaches it to every
 *   outgoing request header.
 *
 * RESPONSE INTERCEPTOR
 *   On a 401 Unauthorized response the store is cleared and the user
 *   is redirected to /login. This covers both expired tokens and
 *   server-side revocation.
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Clear persisted auth state
      useAuthStore.getState().logout();

      // Hard redirect — Next.js router is not available here,
      // but window is available in the browser at this call site.
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
