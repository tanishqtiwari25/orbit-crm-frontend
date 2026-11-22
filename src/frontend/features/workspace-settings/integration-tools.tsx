"use client";
import { useCallback, useEffect, useState } from "react";
import { api, mutate } from "@/frontend/shared/api/client";
import { ErrorNotice } from "@/frontend/shared/ui/dialog";
export function IntegrationTools({ orgId }: { orgId: string }) {
  const [forms, setForms] = useState<
      { id: string; name: string; revokedAt: string | null }[]
    >([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    async () =>
      setForms(
        (
          await api<{
            forms: { id: string; name: string; revokedAt: string | null }[];
          }>("public-forms")
        ).forms,
      ),
    [],
  );
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);
  const run = async (
    fn: () => Promise<{ detail?: string; embed?: string }>,
  ) => {
    setBusy(true);
    setError("");
    try {
      const r = await fn();
      setNotice(r.embed ?? r.detail ?? "Saved.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <h3>Verified inbound email and delivery events</h3>
      {error && <ErrorNotice message={error} />}{" "}
      {notice && (
        <pre
          className="info-notice"
          role="status"
          style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
        >
          {notice}
        </pre>
      )}
      <p>
        Register this URL in Resend: <code>/api/webhooks/email/{orgId}</code>.
        Subscribe to email.received and the required delivery events. Configure
        a receiving domain and a unique workspace inbox in Resend first.
      </p>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          run(() =>
            mutate("integrations", {
              provider: "email-webhook",
              ...Object.fromEntries(f),
            }),
          );
        }}
      >
        <label>
          Workspace inbound address
          <input name="inboundAddress" type="email" required />
        </label>
        <label>
          Resend webhook signing secret
          <input
            name="secret"
            type="password"
            autoComplete="off"
            required
            pattern="whsec_.*"
          />
        </label>
        <button className="button primary" disabled={busy}>
          Save webhook
        </button>
      </form>
      <h3>Embeddable lead forms</h3>
      <p>
        Publish a consent-aware form on the exact websites you allow. No API
        secret is embedded. Signed expiring submissions, honeypot, duplicate
        handling and request limits are enforced. Add ingress bot controls for
        public campaigns.
      </p>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          run(() =>
            mutate("public-forms", {
              name: f.get("name"),
              origins: String(f.get("origins"))
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            }),
          );
        }}
      >
        <label>
          Form name
          <input name="name" required minLength={2} maxLength={100} />
        </label>
        <label>
          Allowed website origins (one per line)
          <textarea
            name="origins"
            required
            placeholder="https://www.example.com"
          />
        </label>
        <button className="button primary" disabled={busy}>
          Create form & embed code
        </button>
      </form>
      {forms.map((f) => (
        <div className="integration-row" key={f.id}>
          <div>
            <strong>{f.name}</strong>
            <p>{f.revokedAt ? "Revoked" : `Form ID: ${f.id}`}</p>
            {!f.revokedAt && (
              <code
                style={{ overflowWrap: "anywhere" }}
              >{`<script src="${typeof window !== "undefined" ? window.location.origin : ""}/lead-form.js" data-form="${f.id}" defer></script>`}</code>
            )}
          </div>
          {!f.revokedAt && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() =>
                run(() => mutate("public-forms", { id: f.id }, "DELETE"))
              }
            >
              Revoke form
            </button>
          )}
        </div>
      ))}
    </>
  );
}
