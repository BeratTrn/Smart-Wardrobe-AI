"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Shirt, User, Mail, Lock } from "lucide-react";
import { registerSchema, type RegisterFormData } from "@/lib/validations/auth";
import { useRegister } from "@/lib/hooks/useAuth";
import { getErrorMessage } from "@/lib/utils/errors";
import { useT } from "@/lib/i18n";

const FIELD_STYLE = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "14px",
};

function getPasswordStrength(password: string, t: (key: string) => string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: "", color: "transparent" };
  if (password.length < 4) return { level: 1, label: t("web.auth.too_short"), color: "#B04040" };
  if (password.length < 6) return { level: 2, label: t("signup.password_weak"), color: "#E07040" };
  if (password.length < 8) return { level: 3, label: t("signup.password_medium"), color: "var(--color-gold)" };
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return { level: 5, label: t("signup.password_strong"), color: "#4A8C5C" };
  return { level: 4, label: t("signup.password_good"), color: "var(--color-gold)" };
}

function FieldWrapper({
  label,
  icon: Icon,
  error,
  children,
}: {
  label: string;
  icon: React.ElementType;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3 px-4 py-3.5" style={FIELD_STYLE}>
        <Icon className="h-4 w-4 text-muted flex-shrink-0" />
        {children}
      </div>
      {error && <p className="text-[11px] text-danger pl-1">{error}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const { t } = useT();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterFormData) => {
    if (!termsAccepted) return;
    registerMutation.mutate(data);
  };

  const strength = getPasswordStrength(password, t);

  return (
    <div
      className="rounded-[28px] overflow-hidden"
      style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
    >
      {/* Gold top accent line */}
      <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, var(--color-gold), var(--color-gold-light), var(--color-gold))" }} />

      <div className="p-8 space-y-7">
        {/* Logo + Heading */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 100%)" }}
            >
              <Shirt className="h-5 w-5 text-black" strokeWidth={2.5} />
            </div>
            <span className="text-[16px] font-black text-text tracking-tight">StyleX</span>
          </div>
          <div>
            <h1 className="text-[34px] font-black text-text leading-none tracking-tight" style={{ whiteSpace: "pre-line" }}>
              {t("signup.account_creation")}
            </h1>
            <p className="text-sm text-muted mt-2.5 leading-relaxed">
              {t("signup.digitalize_your_wardrobe")}
            </p>
          </div>
        </div>

        {/* Error */}
        {registerMutation.isError && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-danger"
            style={{ background: "rgba(176,64,64,0.1)", border: "1px solid rgba(176,64,64,0.3)" }}
          >
            {getErrorMessage(registerMutation.error)}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <FieldWrapper label={t("signup.full_name")} icon={User} error={errors.kullaniciAdi?.message}>
            <input
              type="text"
              placeholder={t("signup.full_name")}
              autoComplete="name"
              className="flex-1 bg-transparent text-sm text-text placeholder:text-muted outline-none"
              {...register("kullaniciAdi")}
            />
          </FieldWrapper>

          <FieldWrapper label={t("signup.email")} icon={Mail} error={errors.email?.message}>
            <input
              type="email"
              placeholder={t("signup.email")}
              autoComplete="email"
              className="flex-1 bg-transparent text-sm text-text placeholder:text-muted outline-none"
              {...register("email")}
            />
          </FieldWrapper>

          <div className="space-y-1.5">
            <FieldWrapper label={t("signup.password")} icon={Lock} error={errors.sifre?.message}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                className="flex-1 bg-transparent text-sm text-text placeholder:text-muted outline-none"
                {...register("sifre")}
                onChange={(e) => {
                  setPassword(e.target.value);
                  register("sifre").onChange(e);
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-muted hover:text-text transition-colors flex-shrink-0"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </FieldWrapper>

            {/* Password strength bar */}
            {password.length > 0 && (
              <div className="px-1 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="flex-1 h-1 rounded-full transition-all duration-300"
                      style={{
                        background: i <= strength.level ? strength.color : "var(--color-border)",
                      }}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-right" style={{ color: strength.color }}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          <FieldWrapper label={t("signup.confirm_password")} icon={Lock} error={undefined}>
            <input
              type={showConfirm ? "text" : "password"}
              placeholder={t("signup.confirm_password")}
              autoComplete="new-password"
              className="flex-1 bg-transparent text-sm text-text placeholder:text-muted outline-none"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="text-muted hover:text-text transition-colors flex-shrink-0"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </FieldWrapper>

          {/* Terms */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              className="h-5 w-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                background: termsAccepted ? "var(--color-gold)" : "transparent",
                border: termsAccepted ? "none" : "1.5px solid var(--color-border)",
              }}
              onClick={() => setTermsAccepted((v) => !v)}
            >
              {termsAccepted && (
                <svg className="h-3 w-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-[12px] text-muted">
              {t("signup.i_accept_terms")}
            </span>
          </label>

          <button
            type="submit"
            disabled={registerMutation.isPending || !termsAccepted}
            className="w-full py-4 rounded-2xl text-black font-bold text-[15px] hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
            style={{ background: "linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 50%, var(--color-gold) 100%)" }}
          >
            {registerMutation.isPending ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                {t("web.auth.creating_account")}
              </>
            ) : (
              t("signup.sign_up")
            )}
          </button>
        </form>

        {/* Login link */}
        <p className="text-center text-sm text-muted">
          {t("signup.already_have_account")}{" "}
          <Link
            href="/login"
            className="font-semibold transition-colors hover:opacity-80"
            style={{ color: "var(--color-gold)" }}
          >
            {t("signup.sign_in")}
          </Link>
        </p>
      </div>
    </div>
  );
}
