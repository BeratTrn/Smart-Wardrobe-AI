"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Mail, AtSign } from "lucide-react";
import { profileSchema, type ProfileFormData } from "@/lib/validations/settings";
import { useUpdateProfile } from "@/lib/hooks/useUsers";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/utils/errors";
import type { UserProfile } from "@/types";

const SBG = "var(--color-surface)";
const BDR = "1px solid var(--color-border)";

interface ProfileTabProps {
  profile: UserProfile;
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: SBG, border: BDR }}>
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--color-gold-dim)" }}
      >
        <Icon className="h-3.5 w-3.5 text-gold" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
        <p className="text-sm text-text truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export function ProfileTab({ profile }: ProfileTabProps) {
  const [saved, setSaved] = useState(false);

  const updateProfile = useUpdateProfile(() => setSaved(true));

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      kullaniciAdi: profile.kullaniciAdi,
      cinsiyet: profile.cinsiyet ?? "Belirtilmemiş",
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    setSaved(false);
    updateProfile.mutate({ kullaniciAdi: data.kullaniciAdi, cinsiyet: data.cinsiyet });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted mb-3">HESAP BILGILERI</p>
        <InfoRow icon={AtSign} label="Kullanici Adi" value={profile.kullaniciAdi} />
        <InfoRow icon={Mail}   label="E-Posta"       value={profile.email} />
      </div>

      <div className="h-px" style={{ background: "var(--color-border)" }} />

      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted mb-3">PROFILI DUZENLE</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Kullanici Adi"
            placeholder="orn. fashionlover"
            error={errors.kullaniciAdi?.message}
            {...register("kullaniciAdi")}
          />

          <div className="space-y-1.5">
            <label className="text-[12px] text-muted block">Cinsiyet</label>
            <select
              className="w-full rounded-lg border border-border bg-white/3 px-3 py-2 text-sm text-text"
              {...register("cinsiyet")}
            >
              <option value="Belirtilmemiş">Belirtilmemiş</option>
              <option value="Kadın">Kadın</option>
              <option value="Erkek">Erkek</option>
            </select>
            <p className="text-[11px] text-muted">
              Kombin önerilerinde (dolap ve web) sana uygun olmayan parçaların gösterilmemesi için kullanılır.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] text-muted block">E-Posta</label>
            <input
              readOnly
              value={profile.email}
              className="w-full rounded-lg border border-border bg-white/3 px-3 py-2 text-sm text-muted cursor-not-allowed"
            />
            <p className="text-[11px] text-muted">E-posta adresi degistirilemez.</p>
          </div>

          {updateProfile.isError && (
            <p className="text-sm text-danger">{getErrorMessage(updateProfile.error)}</p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={updateProfile.isPending} disabled={!isDirty}>
              Degisiklikleri Kaydet
            </Button>
            {saved && !updateProfile.isPending && (
              <div className="flex items-center gap-1.5 text-success text-sm">
                <CheckCircle className="h-4 w-4" />
                Kaydedildi
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
