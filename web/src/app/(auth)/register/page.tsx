"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { registerSchema, type RegisterFormData } from "@/lib/validations/auth";
import { useRegister } from "@/lib/hooks/useAuth";
import { getErrorMessage } from "@/lib/utils/errors";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="glass rounded-2xl p-8 shadow-card space-y-7">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gold-gradient shadow-card mb-1">
          <Sparkles size={22} className="text-black" />
        </div>
        <h1 className="text-2xl font-bold text-text">Create account</h1>
        <p className="text-sm text-muted">
          Start building your smart wardrobe today
        </p>
      </div>

      {registerMutation.isError && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {getErrorMessage(registerMutation.error)}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Username"
          type="text"
          placeholder="your_username"
          autoComplete="username"
          hint="Letters, numbers, and underscores only."
          error={errors.kullaniciAdi?.message}
          {...register("kullaniciAdi")}
        />

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="Min. 6 characters"
          autoComplete="new-password"
          hint="At least 6 characters."
          error={errors.sifre?.message}
          rightElement={
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              className="text-muted hover:text-text transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          {...register("sifre")}
        />

        <Button
          type="submit"
          fullWidth
          loading={registerMutation.isPending}
          className="mt-2"
        >
          Create account
        </Button>
      </form>

      <p className="text-center text-xs text-muted leading-relaxed">
        By creating an account you agree to our{" "}
        <span className="text-text-sub">Terms of Service</span> and{" "}
        <span className="text-text-sub">Privacy Policy</span>.
      </p>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-gold hover:text-gold-light font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
