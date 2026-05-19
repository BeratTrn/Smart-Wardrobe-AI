"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck, RotateCcw } from "lucide-react";
import {
  verifyEmailSchema,
  type VerifyEmailFormData,
} from "@/lib/validations/auth";
import { useVerifyEmail, useResendVerification } from "@/lib/hooks/useAuth";
import { getErrorMessage } from "@/lib/utils/errors";
import { OtpInput } from "@/components/ui/OtpInput";
import { Button } from "@/components/ui/Button";

const RESEND_COOLDOWN = 60;

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [cooldown, setCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN);
    setResendSuccess(true);
  }, []);

  const verify = useVerifyEmail();
  const resend = useResendVerification();

  const {
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyEmailFormData>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { otpCode: "" },
  });

  const otpValue = watch("otpCode");

  const onSubmit = (data: VerifyEmailFormData) => {
    verify.mutate({ email, otpCode: data.otpCode });
  };

  const handleResend = () => {
    resend.mutate({ email });
    startCooldown();
    setResendSuccess(false);
  };

  return (
    <div className="glass rounded-2xl p-8 shadow-card space-y-7 text-center">
      <div className="space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gold-gradient shadow-card mb-1">
          <MailCheck size={22} className="text-black" />
        </div>
        <h1 className="text-2xl font-bold text-text">Check your email</h1>
        <p className="text-sm text-muted leading-relaxed">
          We sent a 6-digit code to{" "}
          {email ? (
            <span className="font-medium text-text-sub break-all">{email}</span>
          ) : (
            "your email address"
          )}
          . Enter it below to verify your account.
        </p>
      </div>

      {verify.isError && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {getErrorMessage(verify.error)}
        </div>
      )}

      {resendSuccess && !resend.isError && (
        <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          A new code has been sent to your email.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="space-y-2">
          <OtpInput
            value={otpValue}
            onChange={(val) =>
              setValue("otpCode", val, { shouldValidate: true })
            }
            error={Boolean(errors.otpCode) || verify.isError}
            disabled={verify.isPending}
          />
          {errors.otpCode && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-danger">
              <span className="inline-block w-1 h-1 rounded-full bg-danger shrink-0" />
              {errors.otpCode.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          fullWidth
          loading={verify.isPending}
          disabled={otpValue.length < 6}
        >
          Verify email
        </Button>
      </form>

      <div className="space-y-1">
        <p className="text-xs text-muted">Didn&apos;t receive the code?</p>
        {cooldown > 0 ? (
          <p className="text-xs text-muted">
            Resend available in{" "}
            <span className="text-text-sub font-medium tabular-nums">
              {cooldown}s
            </span>
          </p>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            loading={resend.isPending}
            leftIcon={<RotateCcw size={13} />}
            onClick={handleResend}
          >
            Resend code
          </Button>
        )}
      </div>
    </div>
  );
}
