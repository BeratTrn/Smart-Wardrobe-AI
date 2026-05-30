"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle, ShieldCheck } from "lucide-react";
import { changePasswordSchema, type ChangePasswordFormData } from "@/lib/validations/settings";
import { useChangePassword, useDeleteAccount } from "@/lib/hooks/useUsers";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/utils/errors";

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
    changePassword.mutate({
      mevcutSifre: data.mevcutSifre,
      yeniSifre: data.yeniSifre,
    });
  };

  return (
    <div className="space-y-8">
      {/* Change password */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4.5 w-4.5 text-gold" />
          <h3 className="text-sm font-semibold">Change Password</h3>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Input
            label="Current Password"
            type="password"
            placeholder="••••••••"
            error={errors.mevcutSifre?.message}
            {...register("mevcutSifre")}
          />
          <Input
            label="New Password"
            type="password"
            placeholder="Min 6 characters"
            error={errors.yeniSifre?.message}
            {...register("yeniSifre")}
          />
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            error={errors.yeniSifreTekrar?.message}
            {...register("yeniSifreTekrar")}
          />

          {changePassword.isError && (
            <p className="text-sm text-danger">{getErrorMessage(changePassword.error)}</p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" loading={changePassword.isPending}>
              Update Password
            </Button>
            {pwSaved && !changePassword.isPending && (
              <div className="flex items-center gap-1.5 text-success text-sm">
                <CheckCircle className="h-4 w-4" />
                Password updated
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-danger/30 bg-danger/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4.5 w-4.5 text-danger" />
          <h3 className="text-sm font-semibold text-danger">Danger Zone</h3>
        </div>
        <p className="text-[13px] text-muted leading-relaxed">
          Permanently delete your account and all associated data — wardrobe items,
          outfits, and travel plans. <strong className="text-foreground">This action cannot be undone.</strong>
        </p>

        {!deleteConfirm ? (
          <Button
            variant="ghost"
            onClick={() => setDeleteConfirm(true)}
            className="border border-danger/40 text-danger hover:bg-danger/10"
          >
            Delete my account
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-danger">
              Are you absolutely sure? This will erase all your data.
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => deleteAccount.mutate()}
                loading={deleteAccount.isPending}
                className="bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30"
              >
                Yes, delete everything
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
