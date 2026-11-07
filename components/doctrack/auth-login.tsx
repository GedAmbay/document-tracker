"use client";
import { useActionState } from "react";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signInAction,
  setPasswordAction,
} from "@/modules/auth/infrastructure/actions";

export function AuthLogin({
  next = "/",
  notice,
  configured = true,
  passwordSetup = false,
}: {
  next?: string;
  notice?: string;
  configured?: boolean;
  passwordSetup?: boolean;
}) {
  const [state, action, pending] = useActionState(
    passwordSetup ? setPasswordAction : signInAction,
    { error: "" },
  );
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="panel w-full max-w-md p-8">
        <div className="mb-7 flex items-center gap-3 text-xl font-bold">
          <ShieldCheck className="text-blue-800" />
          DocTrack
        </div>
        <p className="eyebrow">BAC SECRETARIAT · AUTHORIZED EMPLOYEES ONLY</p>
        <h1 className="mt-4 text-2xl font-semibold">
          {passwordSetup ? "Set your password" : "Sign in to DocTrack"}
        </h1>
        <p className="my-4 text-sm leading-relaxed text-slate-500">
          {passwordSetup
            ? "Complete your administrator invitation. Use a unique password of at least 12 characters."
            : "Account access is managed by your BAC administrator. Public registration is disabled."}
        </p>
        {!configured && (
          <div className="info-note my-5">
            Authentication is not configured. Follow docs/auth-setup.md to
            configure a local Supabase project. Access remains locked.
          </div>
        )}
        {notice && (
          <p className="info-note my-4">
            {notice === "invite"
              ? "The invitation is invalid or expired. Ask your administrator for a new invitation."
              : "Sign in with an active authorized account to continue."}
          </p>
        )}
        <form action={action} className="space-y-5">
          <input type="hidden" name="next" value={next} />
          {!passwordSetup && (
            <div className="form-field">
              <Label htmlFor="auth-email">Work email</Label>
              <Input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
              />
            </div>
          )}
          <div className="form-field">
            <Label htmlFor="auth-password">
              {passwordSetup ? "New password" : "Password"}
            </Label>
            <Input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={passwordSetup ? "new-password" : "current-password"}
              required
              minLength={passwordSetup ? 12 : 1}
              maxLength={128}
            />
          </div>
          {passwordSetup && (
            <div className="form-field">
              <Label htmlFor="auth-confirm">Confirm password</Label>
              <Input
                id="auth-confirm"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
              />
            </div>
          )}
          {state.error && (
            <p className="error-note" role="alert">
              {state.error}
            </p>
          )}
          <Button
            className="w-full"
            type="submit"
            disabled={pending || !configured}
          >
            {pending ? <Loader2 className="animate-spin" /> : <LockKeyhole />}
            {pending
              ? "Please wait…"
              : passwordSetup
                ? "Set password"
                : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  );
}
