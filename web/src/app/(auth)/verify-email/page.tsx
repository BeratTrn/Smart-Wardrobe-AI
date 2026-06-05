"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shirt, ArrowLeft } from "lucide-react";
import { verifyEmailSchema, type VerifyEmailFormData } from "@/lib/validations/auth";
import { useVerifyEmail, useResendVerification } from "@/lib/hooks/useAuth";
import { getErrorMessage } from "@/lib/utils/errors";
import { OtpInput } from "@/components/ui/OtpInput";

const RESEND_COOLDOWN = 60;

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const verify = useVerifyEmail();
  const resend = useResendVerification();

  const { setValue, watch, handleSubmit, formState: { errors } } =
    useForm<VerifyEmailFormData>({
      resolver: zodResolver(verifyEmailSchema),
      defaultValues: { otpCode: "" },
    });

  const otpValue = watch("otpCode");

  const onSubmit = (data: VerifyEmailFormData) => {
    verify.mutate({ email, otpCode: data.otpCode });
  };

  const handleResend = () => {
    resend.mutate({ email });
    setCooldown(RESEND_COOLDOWN);
    setResendSuccess(true);
  };

  return (
    <div
      className="rounded-[28px] overflow-hidden"
      style={{ background: "#111110", border: "1px solid #1E1E18" }}
    >
      <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #C9A84C, #E8C97A, #C9A84C)" }} />

      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)" }}
            >
              <Shirt className="h-5 w-5 text-black" strokeWidth={2.5} />
            </div>
            <span className="text-[16px] font-black text-text">StyleX</span>
          </div>
          <Link
            href="/login"
            className="h-9 w-9 rounded-xl flex items-center justify-center text-muted hover:text-text transition-colors"
            style={{ background: "#161614", border: "1px solid #272720" }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-[32px] font-black text-text leading-none tracking-tight">
            E-posta<br />Doğrulama.
          </h1>
          <p className="text-sm text-muted mt-3 leading-relaxed">
            6 haneli doğrulama kodu{" "}
            {email && (
              <span className="font-semibold" style={{ color: "var(--color-gold)" }}>
                {email}
              </span>
            )}{" "}
            adresine gönderildi.
          </p>
        </div>

        {/* Errors */}
        {verify.isError && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-danger"
            style={{ background: "rgba(176,64,64,0.1)", border: "1px solid rgba(176,64,64,0.3)" }}
          >
            {getErrorMessage(verify.error)}
          </div>
        )}
        {resendSuccess && !resend.isError && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-success"
            style={{ background: "rgba(74,140,92,0.1)", border: "1px solid rgba(74,140,92,0.3)" }}
          >
            Yeni kod e-posta adresinize gönderildi.
          </div>
        )}

        {/* OTP Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <OtpInput
            value={otpValue}
            onChange={(val) => setValue("otpCode", val, { shouldValidate: true })}
            error={Boolean(errors.otpCode) || verify.isError}
            disabled={verify.isPending}
          />

          <button
            type="submit"
            disabled={verify.isPending || otpValue.length < 6}
            className="w-full py-4 rounded-2xl text-black font-bold text-[15px] hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 50%, #C9A84C 100%)" }}
          >
            {verify.isPending ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                Doğrulanıyor…
              </>
            ) : (
              "Doğrula"
            )}
          </button>
        </form>

        {/* Resend */}
        <div className="text-center">
          {cooldown > 0 ? (
            <p className="text-sm text-muted">
              Kodu tekrar gönder{" "}
              <span className="font-semibold text-text tabular-nums">({cooldown} sn)</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resend.isPending}
              className="text-sm font-semibold transition-colors hover:opacity-80"
              style={{ color: "var(--color-gold)" }}
            >
              {resend.isPending ? "Gönderiliyor…" : "Kodu tekrar gönder"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
