"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle, CheckCircle, ShieldCheck,
  FileText, HelpCircle, Info, LogOut, Trash2, ChevronRight,
} from "lucide-react";
import { changePasswordSchema, type ChangePasswordFormData } from "@/lib/validations/settings";
import { useChangePassword, useDeleteAccount } from "@/lib/hooks/useUsers";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/utils/errors";

const SBG = "var(--color-surface)";
const BDR = "1px solid var(--color-border)";

const ACCOUNT_LINKS: { icon: React.ElementType; label: string; href: string }[] = [
  { icon: FileText,   label: "Gizlilik Politikasi", href: "/privacy" },
  { icon: HelpCircle, label: "Yardim & Destek",     href: "/help" },
  { icon: Info,       label: "Hakkinda",             href: "/about" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted mb-3">{children}</p>
  );
}

function LinkRow({ icon: Icon, label, href }: { icon: React.ElementType; label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-white/4 group"
      style={{ background: SBG, border: BDR }}
    >
      <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-gold-dim)" }}>
        <Icon className="h-3.5 w-3.5 text-muted group-hover:text-gold transition-colors" />
      </div>
      <span className="flex-1 text-sm text-text">{label}</span>
      <ChevronRight className="h-3.5 w-3.5 text-muted opacity-50" />
    </a>
  );
}

export function SecurityTab() {
  const [pwSaved, setPwSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const changePassword = useChangePassword(() => {
    setPwSaved(true);
    reset();
  });
  const deleteAccount = useDeleteAccount();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = (data: ChangePasswordFormData) => {
    setPwSaved(false);
    changePassword.mutate({ mevcutSifre: data.mevcutSifre, yeniSifre: data.yeniSifre });
  };

  return (
    <div className="space-y-8">

      <div className="space-y-4">
        <SectionLabel>SIFRE DEGISTIR</SectionLabel>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-4 w-4 text-gold" />
          <h3 className="text-sm font-semibold">Sifre Guncelle</h3>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Input
            label="Mevcut Sifre"
            type="password"
            placeholder="dot dot dot dot dot dot dot dot"
            error={errors.mevcutSifre?.message}
            {...register("mevcutSifre")}
          />
          <Input
            label="Yeni Sifre"
            type="password"
            placeholder="En az 6 karakter"
            error={errors.yeniSifre?.message}
            {...register("yeniSifre")}
          />
          <Input
            label="Yeni Sifre (Tekrar)"
            type="password"
            placeholder="dot dot dot dot dot dot dot dot"
            error={errors.yeniSifreTekrar?.message}
            {...register("yeniSifreTekrar")}
          />
          {changePassword.isError && (
            <p className="text-sm text-danger">{getErrorMessage(changePassword.error)}</p>
          )}
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={changePassword.isPending}>
              Sifreyi Guncelle
            </Button>
            {pwSaved && !changePassword.isPending && (
              <div className="flex items-center gap-1.5 text-success text-sm">
                <CheckCircle className="h-4 w-4" /> Guncellendi
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="h-px" style={{ background: "var(--color-border)" }} />

      <div>
        <SectionLabel>HESAP</SectionLabel>
        <div className="space-y-2">
          {ACCOUNT_LINKS.map((l) => (
            <LinkRow key={l.label} icon={l.icon} label={l.label} href={l.href} />
          ))}
        </div>
      </div>

      <div className="h-px" style={{ background: "var(--color-border)" }} />

      <div>
        <SectionLabel>OTURUM</SectionLabel>
        <button
          type="button"
          className="w-full flex items-center gap-3 rounded-xl px-4 py-3 mb-2 transition-colors hover:bg-danger/8"
          style={{ background: SBG, border: BDR }}
          onClick={() => { window.location.href = "/login"; }}
        >
          <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,68,68,0.1)" }}>
            <LogOut className="h-3.5 w-3.5 text-danger" />
          </div>
          <span className="flex-1 text-sm text-danger font-medium">Cikis Yap</span>
          <ChevronRight className="h-3.5 w-3.5 text-danger opacity-50" />
        </button>
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={{ border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)" }}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-danger" />
          <h3 className="text-sm font-semibold text-danger">Tehlikeli Bolge</h3>
        </div>
        <p className="text-[13px] text-muted leading-relaxed">
          Hesabinizi ve tum verilerinizi kalici olarak silin. Bu islem geri alinamaz.
        </p>
        {!deleteConfirm ? (
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-danger text-sm font-medium hover:bg-danger/10 transition-colors"
            style={{ border: "1px solid rgba(239,68,68,0.4)" }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hesabi Kalici Olarak Sil
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-danger">Emin misiniz? Bu islem tum verilerinizi silecek.</p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setDeleteConfirm(false)}>Iptal</Button>
              <Button
                onClick={() => deleteAccount.mutate()}
                loading={deleteAccount.isPending}
                className="bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30"
              >
                Evet, her seyi sil
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
