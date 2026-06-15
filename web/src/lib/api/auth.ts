/**
 * Auth API — thin wrappers around the Node.js /api/auth/* endpoints.
 * All functions return the response DATA (not the Axios response object)
 * so they compose cleanly with TanStack Query mutationFn.
 */

import api from "@/lib/api/axios";
import type { AuthResponse, User } from "@/types";

// Response shapes

export interface RegisterResponse {
  mesaj: string;
  email: string;
}

export interface VerifyEmailResponse extends AuthResponse {}

export interface ResendResponse {
  mesaj: string;
  email: string;
}

export interface ForgotPasswordResponse {
  mesaj: string;
}

export interface MeResponse {
  kullanici: User;
}

// Request shapes

export interface LoginPayload {
  email: string;
  sifre: string;
}

export interface RegisterPayload {
  kullaniciAdi: string;
  email: string;
  sifre: string;
}

export interface VerifyEmailPayload {
  email: string;
  otpCode: string;
}

// API calls

/** POST /api/auth/login */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/auth/login", payload);
  return res.data;
}

/** POST /api/auth/register — creates a PendingRegistration and sends OTP */
export async function register(
  payload: RegisterPayload
): Promise<RegisterResponse> {
  const res = await api.post<RegisterResponse>("/auth/register", payload);
  return res.data;
}

/** POST /api/auth/verify-email — validates OTP, creates User, returns JWT */
export async function verifyEmail(
  payload: VerifyEmailPayload
): Promise<VerifyEmailResponse> {
  const res = await api.post<VerifyEmailResponse>(
    "/auth/verify-email",
    payload
  );
  return res.data;
}

/** POST /api/auth/resend-verification — generates a new OTP */
export async function resendVerification(
  payload: Pick<VerifyEmailPayload, "email">
): Promise<ResendResponse> {
  const res = await api.post<ResendResponse>(
    "/auth/resend-verification",
    payload
  );
  return res.data;
}

/** GET /api/auth/me — returns the current user's profile */
export async function getMe(): Promise<MeResponse> {
  const res = await api.get<MeResponse>("/auth/me");
  return res.data;
}

/** POST /api/auth/forgot-password — sends a password-reset email */
export async function forgotPassword(
  payload: Pick<LoginPayload, "email">
): Promise<ForgotPasswordResponse> {
  const res = await api.post<ForgotPasswordResponse>(
    "/auth/forgot-password",
    payload
  );
  return res.data;
}

/** POST /api/auth/google — authenticates via Google ID token */
export async function googleAuth(payload: {
  idToken: string;
}): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/auth/google", payload);
  return res.data;
}
