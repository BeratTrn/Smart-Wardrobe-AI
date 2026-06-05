"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Shirt, Mail, MailCheck } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validations/auth";
import { useForgotPassword } from "@/lib/hooks/useAuth";
import { getErrorMessage } from "@/lib/utils/errors";

const FIELD_STYLE = {
  background: "#161614",
  border: "1px solid #272720",
  borderRadius: "14px",
};

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();

  const { register, handleSubmit, formState: { errors } } =
    useForm<ForgotPasswordFormData>({
      resolver: zodResolver(forgotPasswordSchema),
    });

  const onSubmit = (data: ForgotPasswordFormData) => {
    forgotPassword.mutate(data);
  };

  // Success state
  if (forgotPassword.isSuccess) {
    return (
      <div
        className="rounded-[28px] overflow-hidden"
        style={{ background: "#111110", border: "1px solid #1E1E18" }}
      >
        <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #C9A84C, #E8C97A, #C9A84C)" }} />
        <div className="p-8 text-center space-y-6">
          <div
            className="h-16 w-16 rounded-full mx-auto flex items-center justify-center"
            style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)" }}
          >
            <MailCheck className="h-8 w-8 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-text">E-postanı Kontrol Et</h1>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              Sıfırlama bağlantısı e-posta adresine gönderildi. Birkaç dakika içinde gelmezse spam kutusunu kontrol et.
            </p>
          </div>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-semibold transition-colors"
            style={{ background: "#161614", border: "1px solid #272720", color: "var(--color-text)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Girişe Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-[28px] overflow-hidden"
      style={{ background: "#111110", border: "1px solid #1E1E18" }}
    >
      <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #C9A84C, #E8C97A, #C9A84C)" }} />

      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)" }}
          >
            <Shirt className="h-5 w-5 text-black" strokeWidth={2.5} />
          </div>
          <span className="text-[16px] font-black text-text">StyleX</span>
        </div>

        <div>
          <h1 className="text-[34px] font-black text-text leading-none tracking-tight">
            Şifreni<br />Sıfırla.
          </h1>
          <p className="text-sm text-muted mt-3 leading-relaxed">
            E-posta adresine sıfırlama bağlantısı göndereceğiz.
          </p>
        </div>

        {forgotPassword.isError && (
          <div
            className="rounded-xl px-4 py-3 text-sm text-danger"
            style={{ background: "rgba(176,64,64,0.1)", border: "1px solid rgba(176,64,64,0.3)" }}
          >
            {getErrorMessage(forgotPassword.error)}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 px-4 py-3.5" style={FIELD_STYLE}>
              <Mail className="h-4 w-4 text-muted flex-shrink-0" />
              <input
                type="email"
                placeholder="E-posta"
                autoComplete="email"
                className="flex-1 bg-transparent text-sm text-text placeholder:text-muted outline-none"
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-danger pl-1">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={forgotPassword.isPending}
            className="w-full py-4 rounded-2xl text-black font-bold text-[15px] hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 50%, #C9A84C 100%)" }}
          >
            {forgotPassword.isPending ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                Gönderiliyor…
              </>
            ) : (
              "Sıfırlama Bağlantısı Gönder"
            )}
          </button>
        </form>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Girişe Dön
        </Link>
      </div>
    </div>
  );
}
