"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as authApi from "@/lib/api/auth";
import { useAuthStore } from "@/lib/store/authStore";
import { isVerificationRequired } from "@/lib/utils/errors";

// Login

export function useLogin() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.token, data.kullanici);
      // If the URL has a ?from= param, restore the intended destination
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get("from") ?? "/dashboard";
      router.replace(redirectTo);
    },
    onError: (error) => {
      // Backend returns 403 with requiresVerification for unverified accounts
      const { required, email } = isVerificationRequired(error);
      if (required && email) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    },
  });
}

// Register

export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      // Registration succeeded — redirect to OTP verification step
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
    },
  });
}

// Verify Email (OTP)

export function useVerifyEmail() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: (data) => {
      setAuth(data.token, data.kullanici);
      router.replace("/dashboard");
    },
  });
}

// Resend OTP

export function useResendVerification() {
  return useMutation({
    mutationFn: authApi.resendVerification,
  });
}

// Forgot Password

export function useForgotPassword() {
  return useMutation({
    mutationFn: authApi.forgotPassword,
  });
}

// Current User (GET /api/auth/me)

export function useMe() {
  const { isAuthenticated, updateUser } = useAuthStore();

  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const data = await authApi.getMe();
      updateUser(data.kullanici);
      return data.kullanici;
    },
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Logout

export function useLogout() {
  const { logout } = useAuthStore();
  const router = useRouter();

  return () => {
    logout();
    router.replace("/login");
  };
}
