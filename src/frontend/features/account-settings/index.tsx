"use client";
import { useEffect, useState, type FormEvent } from "react";
import { api, mutate } from "@/frontend/shared/api/client";
import { Dialog, ErrorNotice } from "@/frontend/shared/ui/dialog";
type Account = {
  mfaEnabled: boolean;
  emailVerified: boolean;
  recoveryCodesRemaining: number;
};
type Calendars = {
  connections: {
    provider: string;
    lastSyncedAt: string | null;
    lastError: string | null;
  }[];
  providers: { id: string; configured: boolean }[];
};
export function AccountSettings({ onClose }: { onClose: () => void }) {
  const [account, setAccount] = useState<Account>();
  const [calendars, setCalendars] = useState<Calendars>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; uri: string }>();
  const [codes, setCodes] = useState<string[]>([]);
  const load = async () => {
    const [a, c] = await Promise.all([
      api<Account>("account"),
      api<Calendars>("calendar"),
    ]);
    setAccount(a);
    setCalendars(c);
  };
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function run(
    fn: () => Promise<{
      detail?: string;
      codes?: string[];
      secret?: string;
      uri?: string;
    }>,
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fn();
      setNotice(r.detail ?? "Saved.");
      if (r.codes) setCodes(r.codes);
      if (r.secret && r.uri) setSetup({ secret: r.secret, uri: r.uri });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const security = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const action = String(f.get("action"));
    run(() => mutate(`account/${action}`, Object.fromEntries(f)));
  };
  return (
    <Dialog title="Your account & connections" onClose={onClose} wide>
      <div className="account-settings">
        {error && <ErrorNotice message={error} />}{" "}
        {notice && (
          <p className="success-notice" role="status">
            {notice}
          </p>
        )}
        {!account ? (
          <p role="status">Loading account…</p>
        ) : (
          <>
            <h3>Email verification</h3>
            <p>
              {account.emailVerified
                ? "Your email is verified."
                : "Your email has not been verified."}
            </p>
            {!account.emailVerified && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => run(() => mutate("account/verify-email", {}))}
              >
                Send verification email
              </button>
            )}
            <h3>Two-factor authentication</h3>
            <p>
              {account.mfaEnabled
                ? `Enabled · ${account.recoveryCodesRemaining} recovery codes remaining.`
                : "Add an authenticator as a second sign-in factor."}
            </p>
            <form className="record-form" onSubmit={security}>
              <label>
                Current password
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={12}
                />
              </label>
              {(account.mfaEnabled || setup) && (
                <label>
                  Authenticator or recovery code
                  <input
                    name="code"
                    autoComplete="one-time-code"
                    required
                    maxLength={64}
                  />
                </label>
              )}
              {setup && !account.mfaEnabled && (
                <div className="info-notice">
                  <p>
                    Add this secret to your authenticator, then enter a code to
                    confirm.
                  </p>
                  <code style={{ overflowWrap: "anywhere" }}>
                    {setup.secret}
                  </code>
                  <p>
                    <a href={setup.uri}>Open authenticator app</a>
                  </p>
                </div>
              )}
              <label>
                Security action
                <select name="action">
                  {account.mfaEnabled ? (
                    <>
                      <option value="mfa-recovery">
                        Regenerate recovery codes
                      </option>
                      <option value="mfa-disable">
                        Disable two-factor authentication
                      </option>
                    </>
                  ) : setup ? (
                    <option value="mfa-enable">Confirm and enable</option>
                  ) : (
                    <option value="mfa-setup">Set up authenticator</option>
                  )}
                </select>
              </label>
              <button className="button primary" disabled={busy}>
                Continue
              </button>
            </form>
            {codes.length > 0 && (
              <div className="info-notice">
                <h4>Save your single-use recovery codes now</h4>
                <p>
                  These codes are shown once. Store them in your password
                  manager.
                </p>
                <pre>{codes.join("\n")}</pre>
                <button
                  className="button secondary"
                  onClick={() => setCodes([])}
                >
                  I saved my codes
                </button>
              </div>
            )}
          </>
        )}
        <h3>Personal calendar connections</h3>
        <p>
          Sync your pending CRM tasks to your primary calendar. Changes to
          linked event titles, times and cancellations sync back. Your unrelated
          personal events stay private. CRM edits win simultaneous changes. No
          attendees are invited.
        </p>
        {calendars?.providers.map((p) => {
          const c = calendars.connections.find((c) => c.provider === p.id);
          return (
            <div className="integration-row" key={p.id}>
              <div>
                <h4>
                  {p.id === "google" ? "Google Calendar" : "Microsoft Outlook"}
                </h4>
                <p>
                  {c
                    ? `Connected · ${c.lastSyncedAt ? `last sync ${new Date(c.lastSyncedAt).toLocaleString()}` : "awaiting first sync"}`
                    : p.configured
                      ? "Disconnected"
                      : "Server OAuth credentials required"}
                </p>
                {c?.lastError && <p role="alert">{c.lastError}</p>}
              </div>
              <div className="button-group">
                {c ? (
                  <>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        run(() => mutate(`calendar/${p.id}/sync`, {}))
                      }
                    >
                      Sync now
                    </button>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        run(() => mutate(`calendar/${p.id}`, {}, "DELETE"))
                      }
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    className="button primary"
                    disabled={busy || !p.configured}
                    onClick={() =>
                      run(async () => {
                        const r = await mutate<{ url: string }>(
                          `calendar/${p.id}/connect`,
                          {},
                        );
                        window.location.assign(r.url);
                        return {};
                      })
                    }
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <button
          className="button secondary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await load();
              return { detail: "Connection status refreshed." };
            })
          }
        >
          Refresh status
        </button>
        <h3>Create another workspace</h3>
        <form
          className="record-form"
          onSubmit={(e) => {
            e.preventDefault();
            const name = new FormData(e.currentTarget).get("name");
            run(async () => {
              await mutate("account/workspace", { name });
              window.location.assign("/dashboard");
              return {};
            });
          }}
        >
          <label>
            Workspace name
            <input name="name" minLength={2} maxLength={100} required />
          </label>
          <button className="button secondary" disabled={busy}>
            Create workspace
          </button>
        </form>
      </div>
    </Dialog>
  );
}
