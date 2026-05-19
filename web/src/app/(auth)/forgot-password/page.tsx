"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, KeyRound, MailCheck } from "lucide-react";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from "@/lib/validations/auth";
import { useForgotPassword } from "@/lib/hooks/useAuth";
import { getErrorMessage } from "@/lib/utils/errors";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    forgotPassword.mutate(data);
  };

  if (forgotPassword.isSuccess) {
    return (
      <div className="glass rounded-2xl p-8 shadow-card space-y-6 text-center">
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gold-gradient shadow-card mb-1">
            <MailCheck size={22} className="text-black" />
          </div>
          <h1 className="text-2xl font-bold text-text">Check your inbox</h1>
          <p className="text-sm text-muted leading-relaxed">
            If an account exists for that email address, we&apos;ve sent a
            password reset link. It may take a minute to arrive.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-1.5 w-full h-11 px-5 rounded-xl border border-border text-sm text-text-sub font-medium hover:bg-card hover:text-text transition-all duration-200"
        >
          <ArrowLeft size={15} />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-8 shadow-card space-y-7">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gold-gradient shadow-card mb-1">
          <KeyRound size={22} className="text-black" />
        </div>
        <h1 className="text-2xl font-bold text-text">Forgot password?</h1>
        <p className="text-sm text-muted leading-relaxed">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {forgotPassword.isError && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {getErrorMessage(forgotPassword.error)}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <Button
          type="submit"
          fullWidth
          loading={forgotPassword.isPending}
          className="mt-2"
        >
          Send reset link
        </Button>
      </form>

      <div className="flex items-center justify-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
