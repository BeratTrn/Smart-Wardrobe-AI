"use client";

import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Loader2, CheckCircle } from "lucide-react";
import Image from "next/image";
import { profileSchema, type ProfileFormData } from "@/lib/validations/settings";
import { useUpdateProfile, useUploadProfilePhoto } from "@/lib/hooks/useUsers";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/utils/errors";
import type { UserProfile } from "@/types";

interface ProfileTabProps {
  profile: UserProfile;
}

export function ProfileTab({ profile }: ProfileTabProps) {
  const [saved, setSaved] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const updateProfile = useUpdateProfile(() => setSaved(true));
  const uploadPhoto = useUploadProfilePhoto((url) => {
    setPhotoPreview(url);
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { kullaniciAdi: profile.kullaniciAdi },
  });

  const onSubmit = (data: ProfileFormData) => {
    setSaved(false);
    updateProfile.mutate({ kullaniciAdi: data.kullaniciAdi });
  };

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setPhotoPreview(URL.createObjectURL(file));
      uploadPhoto.mutate(file);
    },
    [uploadPhoto]
  );

  const avatarSrc = photoPreview || profile.profilFoto || null;
  const initials = profile.kullaniciAdi?.slice(0, 2).toUpperCase() ?? "SW";

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0">
          <div className="h-20 w-20 rounded-2xl overflow-hidden bg-gold/10 border border-gold/20 flex items-center justify-center">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt="Avatar"
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <span className="text-xl font-bold text-gold">{initials}</span>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadPhoto.isPending}
            className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-full glass border border-white/20 flex items-center justify-center text-muted hover:text-gold transition-colors"
          >
            {uploadPhoto.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <div>
          <p className="font-medium">{profile.kullaniciAdi}</p>
          <p className="text-[13px] text-muted">{profile.email}</p>
          <p className="text-[11px] text-muted mt-0.5">
            Member since{" "}
            {new Date(profile.createdAt).toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Upload error */}
      {uploadPhoto.isError && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {getErrorMessage(uploadPhoto.error)}
        </div>
      )}

      {/* Profile form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Username"
          placeholder="e.g. fashionlover"
          error={errors.kullaniciAdi?.message}
          {...register("kullaniciAdi")}
        />

        {/* Email (read-only) */}
        <div className="space-y-1.5">
          <label className="text-[12px] text-muted block">Email</label>
          <input
            readOnly
            value={profile.email}
            className="w-full rounded-lg border border-border bg-white/3 px-3 py-2 text-sm text-muted cursor-not-allowed"
          />
          <p className="text-[11px] text-muted">Email cannot be changed</p>
        </div>

        {updateProfile.isError && (
          <p className="text-sm text-danger">{getErrorMessage(updateProfile.error)}</p>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            loading={updateProfile.isPending}
            disabled={!isDirty}
          >
            Save Changes
          </Button>
          {saved && !updateProfile.isPending && (
            <div className="flex items-center gap-1.5 text-success text-sm">
              <CheckCircle className="h-4 w-4" />
              Saved
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
