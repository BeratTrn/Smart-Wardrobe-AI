import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as usersApi from "@/lib/api/users";
import type {
  UpdateProfilePayload,
  UpdateBodyPayload,
  UpdatePreferencesPayload,
  ChangePasswordPayload,
} from "@/lib/api/users";
import { useAuthStore } from "@/lib/store/authStore";

export const userKeys = {
  profile: ["user", "profile"] as const,
};

/** Fetch the full user profile (GET /api/auth/me) */
export function useProfile() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: userKeys.profile,
    queryFn: () => usersApi.getProfile(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

/** PUT /api/users/profile */
export function useUpdateProfile(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => usersApi.updateProfile(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.profile });
      onSuccess?.();
    },
  });
}

/** PUT /api/users/profile/body */
export function useUpdateBodyProfile(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateBodyPayload) => usersApi.updateBodyProfile(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.profile });
      onSuccess?.();
    },
  });
}

/** PUT /api/users/profile/photo/upload */
export function useUploadProfilePhoto(onSuccess?: (url: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => usersApi.uploadProfilePhoto(file),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: userKeys.profile });
      onSuccess?.(data.profilFoto);
    },
  });
}

/** PUT /api/users/preferences */
export function useUpdatePreferences(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePreferencesPayload) => usersApi.updatePreferences(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.profile });
      onSuccess?.();
    },
  });
}

/** PUT /api/auth/change-password */
export function useChangePassword(onSuccess?: () => void) {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => usersApi.changePassword(payload),
    onSuccess: () => onSuccess?.(),
  });
}

/** DELETE /api/auth/me */
export function useDeleteAccount() {
  const { logout } = useAuthStore();
  return useMutation({
    mutationFn: () => usersApi.deleteAccount(),
    onSuccess: () => {
      logout();
      if (typeof window !== "undefined") window.location.href = "/login";
    },
  });
}

/** POST /api/users/fcm-token — silent, no UI feedback needed on success */
export function useSaveFcmToken() {
  return useMutation({
    mutationFn: (fcmToken: string) => usersApi.saveFcmToken(fcmToken),
  });
}
