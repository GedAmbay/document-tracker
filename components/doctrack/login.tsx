"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  FileStack,
  Loader2,
  LockKeyhole,
  MapPin,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Brand } from "./app-shell";
import { useMock } from "./mock-provider";

export function LoginScreen() {
  const router = useRouter();
  const store = useMock();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  const [fail, setFail] = useState(false);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!z.email().safeParse(email).success || password.length < 8) {
      setError(
        "Enter a valid email and a demo password of at least 8 characters.",
      );
      return;
    }
    setBusy(true);
    setError("");
    await new Promise((resolve) => setTimeout(resolve, 650));
    if (fail) {
      setBusy(false);
      setError(
        "Unable to sign in. This is a simulated sign-in error. Turn off the error preview to continue.",
      );
      return;
    }
    store.setSignedIn(true);
    store.setPreview("ready");
    router.push("/");
  }
  function fill() {
    setEmail("maria.santos@bac.example.gov.ph");
    setPassword("DocTrack-demo");
    setError("");
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <Brand light />
        <div className="login-story-content">
          <span className="welcome-label">BUILT FOR THE BAC SECRETARIAT</span>
          <h2>
            Less chasing.
            <br />
            Clearer tracking.
          </h2>
          <p>
            Know where your documents are,
            <br className="hidden xl:block" /> from one handoff to the next.
          </p>
          <div className="login-packet">
            <div className="flex items-center gap-3">
              <span className="login-doc-icon">
                <FileStack />
              </span>
              <div>
                <span>PR PACKET</span>
                <strong>2026-11-0142</strong>
              </div>
              <span className="ml-auto rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] text-emerald-200">
                Tracked
              </span>
            </div>
            <div className="login-route">
              <span>
                <Check className="size-3" />
              </span>
              <i />
              <span>
                <MapPin className="size-3" />
              </span>
              <i />
              <span>
                <FileStack className="size-3" />
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-blue-200/70">
              <span>BAC Secretariat</span>
              <span>Budget Office</span>
              <span>Mayor’s Office</span>
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-blue-100/80">
              <ShieldCheck className="size-3.5" />
              One permanent QR. A complete movement history.
            </div>
          </div>
          <div className="login-features">
            <span>
              <ScanLine />
              Scan in seconds
            </span>
            <span>
              <MapPin />
              Track every handoff
            </span>
            <span>
              <ShieldCheck />
              Stay accountable
            </span>
          </div>
        </div>
        <p className="login-story-footer">
          DocTrack · Document tracking, made clearer.
        </p>
      </section>
      <section className="login-form-side">
        <div className="mb-12 lg:hidden">
          <Brand />
        </div>
        <div className="login-form-wrap">
          <span className="login-demo-badge">
            <span className="size-1.5 rounded-full bg-blue-600" />
            INTERACTIVE DEMO
          </span>
          <h1>Welcome back.</h1>
          <p className="login-subtitle">
            Sign in to your BAC tracking workspace.
          </p>
          <div className="info-note mt-6">
            <ShieldCheck className="size-4 shrink-0" />
            <p>
              Mock data only. No authentication service is connected. Use demo
              credentials, not your real password.
            </p>
          </div>
          <form onSubmit={login} className="mt-7 space-y-5" noValidate>
            <div className="form-field">
              <Label htmlFor="login-email">Work email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="off"
                placeholder="you@bac.example.gov.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-field">
              <div className="flex justify-between">
                <Label htmlFor="login-password">Password</Label>
                <button
                  type="button"
                  className="text-xs font-medium text-blue-800"
                  onClick={() => setHelp(true)}
                >
                  Need help signing in?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={show ? "text" : "password"}
                  autoComplete="off"
                  placeholder="Enter your demo password"
                  className="pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>
            {error && (
              <div className="error-note" role="alert">
                <CircleAlert className="size-4 shrink-0" />
                {error}
              </div>
            )}
            <Button type="submit" className="h-12 w-full" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <LockKeyhole />}
              {busy ? "Opening workspace…" : "Sign in to DocTrack"}
              {!busy && <ArrowRight className="ml-auto" />}
            </Button>
          </form>
          <div className="login-divider">
            <span />
            EXPLORING THE DEMO?
            <span />
          </div>
          <Button variant="outline" onClick={fill} className="h-11 w-full">
            Use demo credentials
          </Button>
          <label className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={fail}
              onChange={(e) => setFail(e.target.checked)}
            />
            Preview sign-in error
          </label>
          <div className="login-security">
            <ShieldCheck className="size-4" />
            <span>
              For the seven authorized BAC employees.
              <br />
              Account access is managed by your administrator.
            </span>
          </div>
        </div>
        <p className="login-footer">
          DocTrack © 2026 <span>·</span> BAC Secretariat
        </p>
      </section>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent>
          <DialogTitle>Help signing in</DialogTitle>
          <DialogDescription>
            This prototype has no real accounts or password reset. Select “Use
            demo credentials”, then sign in. For live access, the future
            workspace administrator will manage invitations and recovery.
          </DialogDescription>
          <Button
            onClick={() => {
              fill();
              setHelp(false);
            }}
          >
            Fill demo credentials
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
