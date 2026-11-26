"use client";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Users,
  Handshake,
  CheckSquare,
  ShieldCheck,
} from "lucide-react";
import { mutate } from "@/frontend/shared/api/client";
import { ErrorNotice } from "@/frontend/shared/ui/dialog";
export function LoginPage() {
  const params = useSearchParams();
  const invite = params.get("invite");
  const reset = params.get("reset");
  const verification = params.get("verify");
  const [mode, setMode] = useState(
    verification
      ? "verify-email"
      : invite
        ? "invite"
        : reset
          ? "reset"
          : "login",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = await mutate<{ detail?: string }>(`auth/${mode}`, {
        ...data,
        ...(verification
          ? { token: verification }
          : invite
            ? { token: invite }
            : reset
              ? { token: reset }
              : {}),
      });
      if (mode === "forgot" || mode === "verify-email") {
        setNotice(r.detail ?? "Check your email.");
        if (mode === "verify-email") setMode("login");
        setBusy(false);
      } else if (mode === "reset") {
        setMode("login");
        setNotice("Password updated. Sign in to continue.");
        setBusy(false);
      } else window.location.assign("/dashboard");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Link className="brand" href="/">
          <span className="brand-symbol" />
          <span>
            orbit<span className="brand-period">.</span>
          </span>
          <span className="brand-crm">CRM</span>
        </Link>
        <div className="auth-story-copy">
          <span className="eyebrow">YOUR BUSINESS. IN FOCUS.</span>
          <h1>
            A clearer view.
            <br />A better workday.
          </h1>
          <p>
            Customers, projects, and your people.
            <br />
            One considered space to move work forward.
          </p>
          <div className="auth-product-preview">
            <div className="auth-preview-title">
              <span className="live-dot" /> Your connected workspace
            </div>
            <div>
              <span className="auth-feature-icon">
                <Users size={20} />
              </span>
              <span>
                <strong>People & relationships</strong>
                <small>Keep every conversation in context.</small>
              </span>
              <ArrowUpRight size={16} />
            </div>
            <div>
              <span className="auth-feature-icon">
                <Handshake size={20} />
              </span>
              <span>
                <strong>Sales & opportunities</strong>
                <small>See the next step in every deal.</small>
              </span>
              <ArrowUpRight size={16} />
            </div>
            <div>
              <span className="auth-feature-icon">
                <CheckSquare size={20} />
              </span>
              <span>
                <strong>Work & your team</strong>
                <small>Clear ownership. Shared progress.</small>
              </span>
              <ArrowUpRight size={16} />
            </div>
          </div>
        </div>
        <p className="auth-foot">
          <ShieldCheck size={16} />
          Private by design. Built around your team.
        </p>
      </section>
      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <span className="badge green">ORBIT WORKSPACE</span>
          <h2>
            {mode === "register"
              ? "Make room for growth."
              : mode === "invite"
                ? "Your team is waiting."
                : mode === "forgot"
                  ? "Find your way back."
                  : mode === "reset"
                    ? "A fresh start."
                    : "Welcome back."}
          </h2>
          <p className="muted">
            {mode === "register"
              ? "Create a workspace and bring your relationships together."
              : mode === "invite"
                ? "Accept your workspace invitation."
                : mode === "login"
                  ? "Sign in to your workspace."
                  : "Securely recover access to your workspace."}
          </p>
          {error && <ErrorNotice message={error} />}{" "}
          {notice && (
            <p role="status" className="info-notice">
              {notice}
            </p>
          )}
          <form onSubmit={submit} className="auth-form">
            {["register", "invite"].includes(mode) && (
              <label>
                Your name
                <input
                  name="name"
                  required
                  minLength={2}
                  autoComplete="name"
                  placeholder="Alex Morgan"
                />
              </label>
            )}
            {mode === "register" && (
              <label>
                Workspace name
                <input
                  name="workspace"
                  required
                  minLength={2}
                  placeholder="Acme Studio"
                />
              </label>
            )}
            {!["invite", "reset", "verify-email"].includes(mode) && (
              <label>
                Work email
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                />
              </label>
            )}
            {!["forgot", "verify-email"].includes(mode) && (
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder="At least 12 characters"
                />
              </label>
            )}
            {["login", "invite"].includes(mode) && (
              <label>
                Authenticator or recovery code (if enabled)
                <input
                  name="code"
                  autoComplete="one-time-code"
                  maxLength={64}
                />
              </label>
            )}
            {mode === "login" && (
              <button
                type="button"
                className="text-button forgot-link"
                onClick={() => {
                  setMode("forgot");
                  setError("");
                }}
              >
                Forgot password?
              </button>
            )}
            <button className="button primary auth-submit" disabled={busy}>
              {busy
                ? "Just a moment…"
                : mode === "register"
                  ? "Create your workspace"
                  : mode === "invite"
                    ? "Accept invitation"
                    : mode === "forgot"
                      ? "Request reset link"
                      : mode === "reset"
                        ? "Update password"
                        : mode === "verify-email"
                          ? "Verify email address"
                          : "Sign in to your workspace"}
              <ArrowUpRight size={18} />
            </button>
          </form>
          <p className="auth-toggle">
            {mode === "login"
              ? "New to Orbit? "
              : mode === "register"
                ? "Already have a workspace? "
                : ""}
            <button
              className="text-button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
                setNotice("");
              }}
            >
              {mode === "login" ? "Create a workspace" : "Back to sign in"}
            </button>
          </p>
          <div className="auth-trust">
            <Check size={14} /> No default credentials <span>·</span>
            <ShieldCheck size={14} /> Secure, private sessions
          </div>
        </div>
        <p className="auth-bottom">Thoughtfully built for the way you work.</p>
      </section>
    </main>
  );
}
