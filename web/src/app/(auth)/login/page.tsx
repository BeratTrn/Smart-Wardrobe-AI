"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Shirt, Mail, Lock } from "lucide-react";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";
import { useLogin } from "@/lib/hooks/useAuth";
import { getErrorMessage } from "@/lib/utils/errors";

const FIELD_STYLE = {
  background: "#161614",
  border: "1px solid #272720",
  borderRadius: "14px",
};
const FIELD_FOCUS_STYLE = {
  ...FIELD_STYLE,
  border: "1px solid rgba(201,168,76,0.6)",
  outline: "none",
};

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
      <label className="text-[12px] text-muted font-medium uppercase tracking-wider">
        {label}
      </label>
      <div
        className="flex items-center gap-3 px-4 py-3.5"
        style={FIELD_STYLE}
      >
        <Icon className="h-4 w-4 text-muted flex-shrink-0" />
        {children}
      </div>
      {error && <p className="text-[11px] text-danger pl-1">{error}</p>}
    </div>
  );
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    login.mutate(data);
  };

  return (
    <div
      className="rounded-[28px] overflow-hidden"
      style={{ background: "#111110", border: "1px solid #1E1E18" }}
    >
      {/* Gold top accent line */}
      <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #C9A84C, #E8C97A, #C9A84C)" }} />

      <div className="p-8 space-y-8">
        {/* Logo + Heading */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)" }}
            >
              <Shirt className="h-5 w-5 text-black" strokeWidth={2.5} />
            </div>
            <span className="text-[16px] font-black text-text tracking-tight">StyleX</span>
          </div>

          <div>
            <h1 className="text-[36px] font-black text-text leading-none tracking-tight">
              Tekrar<br />Hoş Geldin.
            </h1>
            <p className="text-sm text-muted mt-3 leading-relaxed">
              Dolabına ve AI stilistine erişmek için giriş yap.
            </p>
          </div>
        </div>

        {/* Error */}
        {login.isError && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-danger flex items-center gap-2"
            style={{ background: "rgba(176,64,64,0.1)", border: "1px solid rgba(176,64,64,0.3)" }}
          >
            {getErrorMessage(login.error)}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FieldWrapper label="E-posta" icon={Mail} error={errors.email?.message}>
            <input
              type="email"
              placeholder="ornek@email.com"
              autoComplete="email"
              className="flex-1 bg-transparent text-sm text-text placeholder:text-muted outline-none"
              {...register("email")}
            />
          </FieldWrapper>

          <FieldWrapper label="Şifre" icon={Lock} error={errors.sifre?.message}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              className="flex-1 bg-transparent text-sm text-text placeholder:text-muted outline-none"
              {...register("sifre")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-muted hover:text-text transition-colors flex-shrink-0"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </FieldWrapper>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-[12px] font-medium transition-colors"
              style={{ color: "var(--color-gold)" }}
            >
              Şifremi unuttum?
            </Link>
          </div>

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full py-4 rounded-2xl text-black font-bold text-[15px] hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 50%, #C9A84C 100%)" }}
          >
            {login.isPending ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                Giriş yapılıyor…
              </>
            ) : (
              "Giriş Yap"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "#1E1E18" }} />
          <span className="text-[11px] text-muted">veya</span>
          <div className="flex-1 h-px" style={{ background: "#1E1E18" }} />
        </div>

        {/* Google (disabled for now) */}
        <button
          type="button"
          disabled
          className="w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-3 opacity-50 cursor-not-allowed transition-opacity"
          style={{ background: "#161614", border: "1px solid #272720" }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span className="text-text">Google ile giriş yap</span>
        </button>

        {/* Register link */}
        <p className="text-center text-sm text-muted">
          Hesabın yok mu?{" "}
          <Link
            href="/register"
            className="font-semibold transition-colors hover:opacity-80"
            style={{ color: "var(--color-gold)" }}
          >
            Hemen kaydol
          </Link>
        </p>
      </div>
    </div>
  );
}
