import { z } from "zod";

// Login

export const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  sifre: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Register

export const registerSchema = z.object({
  kullaniciAdi: z
    .string()
    .min(3, { message: "Username must be at least 3 characters." })
    .max(30, { message: "Username must be at most 30 characters." })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: "Only letters, numbers, and underscores allowed.",
    }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  sifre: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// Verify Email (OTP)

export const verifyEmailSchema = z.object({
  otpCode: z
    .string()
    .min(6, { message: "Please enter the full 6-digit code." })
    .max(6, { message: "Code must be exactly 6 digits." })
    .regex(/^\d+$/, { message: "Code must contain digits only." }),
});

export type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;

// Forgot Password

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
