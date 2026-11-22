"use client";
import { useState, type FormEvent } from "react";
import { Check, Plus, Save, Copy, Unplug, ShieldCheck } from "lucide-react";
import { api, mutate } from "@/frontend/shared/api/client";
import { ErrorNotice } from "@/frontend/shared/ui/dialog";
import { IntegrationTools } from "./integration-tools";
import { RetentionTools } from "./retention-tools";
import {
  initials,
  type Bootstrap,
  type Settings,
  type Data,
} from "@/frontend/entities/crm";
export function WorkspaceSettings({
  bootstrap,
  onChanged,
}: {
  bootstrap: Bootstrap;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState("Workspace");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [audits, setAudits] = useState<Data[]>([]);
  const [captureKey, setCaptureKey] = useState<{
    key: string;
    id: string;
  } | null>(null);
  const [connections, setConnections] = useState<
    { id: string; provider: string; externalAccountId: string }[]
  >([]);
  const s = bootstrap.organization.settings;
  const run = async (fn: () => Promise<unknown>, message = "Saved.") => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await fn();
      setNotice(message);
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const next: Settings = { ...s };
    try {
      if (tab === "Workspace") {
        next.timezone = String(f.get("timezone"));
        next.currency = String(f.get("currency")).toUpperCase();
        next.visibility = String(f.get("visibility")) as Settings["visibility"];
        next.brand = String(f.get("brand"));
        next.quoteTerms = String(f.get("quoteTerms"));
        next.retentionDays = Number(f.get("retentionDays"));
        next.workStart = Number(f.get("workStart"));
        next.workEnd = Number(f.get("workEnd"));
        next.workDays = String(f.get("workDays")).split(",").map(Number);
        next.emailReminders = f.get("emailReminders") === "on";
        next.alerts = {
          enabled: f.get("alertsEnabled") === "on",
          email: f.get("alertsEmail") === "on",
          failedJobs: Number(f.get("failedJobs")),
          backlog: Number(f.get("backlog")),
          overdueHours: Number(f.get("overdueHours")),
        };
      }
      if (tab === "Scoring") {
        next.scoring = { ...s.scoring, weights: { ...s.scoring.weights } };
        for (const k of Object.keys(
          next.scoring.weights,
        ) as (keyof typeof next.scoring.weights)[])
          next.scoring.weights[k] = Number(f.get(k));
        next.scoring.hot = Number(f.get("hot"));
        next.scoring.warm = Number(f.get("warm"));
        next.scoring.decayPerWeek = Number(f.get("decayPerWeek"));
      }
      if (tab === "Pipelines") {
        next.pipelines = JSON.parse(String(f.get("pipelines")));
        next.stages = JSON.parse(String(f.get("stages")));
        next.lostReasons = String(f.get("lostReasons"))
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean);
        next.leadSources = String(f.get("leadSources"))
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean);
        next.tags = String(f.get("tags"))
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean);
      }
      if (tab === "Custom fields")
        next.customFields = JSON.parse(String(f.get("customFields")));
    } catch {
      setError(
        "The JSON configuration is invalid. Check quotes, commas and brackets.",
      );
      return;
    }
    await run(
      () => mutate("settings", next, "PATCH"),
      "Workspace settings saved.",
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE YOURSELF AT HOME</div>
          <h1>Workspace settings</h1>
          <p>A workspace that works the way you do.</p>
        </div>
        <span className="badge green">
          <ShieldCheck size={13} />
          Administrator
        </span>
      </div>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {[
            "Workspace",
            "Scoring",
            "Pipelines",
            "Custom fields",
            "Team",
            "Integrations",
            "API access",
            "Audit log",
            "Data protection",
          ].map((t) => (
            <button
              key={t}
              className={tab === t ? "selected" : ""}
              onClick={async () => {
                setTab(t);
                setError("");
                setNotice("");
                if (t === "Audit log")
                  try {
                    setAudits((await api<{ audits: Data[] }>("audit")).audits);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                if (t === "Integrations")
                  try {
                    setConnections(
                      (
                        await api<{ connections: typeof connections }>(
                          "integrations",
                        )
                      ).connections,
                    );
                  } catch (e) {
                    setError((e as Error).message);
                  }
              }}
            >
              {t}
            </button>
          ))}
        </nav>
        <section className="panel settings-panel">
          <h2>{tab}</h2>
          {error && <ErrorNotice message={error} />}{" "}
          {notice && (
            <p className="success-notice" role="status">
              {notice}
            </p>
          )}
          {["Workspace", "Scoring", "Pipelines", "Custom fields"].includes(
            tab,
          ) && (
            <form
              onSubmit={save}
              className="record-form"
              key={`${tab}-${bootstrap.organization.id}`}
            >
              <div className="form-grid">
                {tab === "Workspace" && (
                  <>
                    <label>
                      Brand / quotation heading
                      <input name="brand" defaultValue={s.brand} required />
                    </label>
                    <label>
                      Currency (ISO 4217)
                      <input
                        name="currency"
                        defaultValue={s.currency}
                        pattern="[A-Za-z]{3}"
                        required
                      />
                    </label>
                    <label>
                      Timezone (IANA)
                      <input
                        name="timezone"
                        defaultValue={s.timezone}
                        required
                      />
                    </label>
                    <label>
                      Record visibility
                      <select name="visibility" defaultValue={s.visibility}>
                        <option value="own">Own records</option>
                        <option value="team">Team records</option>
                        <option value="organization">Organization-wide</option>
                      </select>
                    </label>
                    <label>
                      Workday start hour
                      <input
                        name="workStart"
                        type="number"
                        min={0}
                        max={23}
                        defaultValue={s.workStart}
                      />
                    </label>
                    <label>
                      Workday end hour
                      <input
                        name="workEnd"
                        type="number"
                        min={1}
                        max={24}
                        defaultValue={s.workEnd}
                      />
                    </label>
                    <label>
                      Working days (0=Sun, 6=Sat)
                      <input
                        name="workDays"
                        defaultValue={s.workDays.join(",")}
                      />
                    </label>
                    <label>
                      Retention review period (days)
                      <input
                        name="retentionDays"
                        type="number"
                        min={30}
                        max={3650}
                        defaultValue={s.retentionDays}
                      />
                    </label>
                    <label className="check-label full">
                      <input
                        type="checkbox"
                        name="alertsEnabled"
                        defaultChecked={s.alerts?.enabled}
                      />
                      Enable operational alerts
                    </label>
                    <label>
                      Failed job threshold
                      <input
                        name="failedJobs"
                        type="number"
                        min={1}
                        max={10000}
                        defaultValue={s.alerts?.failedJobs ?? 1}
                      />
                    </label>
                    <label>
                      Runnable backlog threshold
                      <input
                        name="backlog"
                        type="number"
                        min={1}
                        max={100000}
                        defaultValue={s.alerts?.backlog ?? 100}
                      />
                    </label>
                    <label>
                      Overdue follow-up threshold (hours)
                      <input
                        name="overdueHours"
                        type="number"
                        min={1}
                        max={720}
                        defaultValue={s.alerts?.overdueHours ?? 24}
                      />
                    </label>
                    <label className="check-label full">
                      <input
                        type="checkbox"
                        name="alertsEmail"
                        defaultChecked={s.alerts?.email}
                      />
                      Email administrators when an alert becomes active
                      (requires live provider)
                    </label>
                    <label className="check-label full">
                      <input
                        type="checkbox"
                        name="emailReminders"
                        defaultChecked={s.emailReminders}
                      />
                      Enable email reminders (requires live email provider)
                    </label>
                    <label className="full">
                      Default quotation terms
                      <textarea
                        name="quoteTerms"
                        defaultValue={s.quoteTerms}
                        rows={4}
                      />
                    </label>
                    <p className="hint full">
                      Administrators can view all records. Other roles follow
                      the selected visibility policy. Retention is a review
                      policy; deletion is not automatic.
                    </p>
                  </>
                )}
                {tab === "Scoring" && (
                  <>
                    <p className="hint full">
                      Explainable rules, with weights totaling 100. Relevant
                      changes are reflected on every read. This is not AI
                      scoring.
                    </p>
                    {Object.entries(s.scoring.weights).map(([k, v]) => (
                      <label key={k}>
                        {k[0].toUpperCase() + k.slice(1)} weight
                        <input
                          name={k}
                          type="number"
                          min={0}
                          max={100}
                          step="any"
                          defaultValue={v}
                          required
                        />
                      </label>
                    ))}
                    <label>
                      Hot threshold
                      <input
                        name="hot"
                        type="number"
                        min={1}
                        max={100}
                        defaultValue={s.scoring.hot}
                        required
                      />
                    </label>
                    <label>
                      Warm threshold
                      <input
                        name="warm"
                        type="number"
                        min={0}
                        max={99}
                        defaultValue={s.scoring.warm}
                        required
                      />
                    </label>
                    <label>
                      Inactivity decay per week
                      <input
                        name="decayPerWeek"
                        type="number"
                        min={0}
                        max={20}
                        defaultValue={s.scoring.decayPerWeek}
                        required
                      />
                    </label>
                  </>
                )}
                {tab === "Pipelines" && (
                  <>
                    <label className="full">
                      Independent pipelines (JSON array)
                      <textarea
                        className="mono"
                        rows={10}
                        name="pipelines"
                        defaultValue={JSON.stringify(
                          s.pipelines ?? [],
                          null,
                          2,
                        )}
                      />
                      <small>
                        Each pipeline has id, name, stages. Each stage has id,
                        name, probability. Use the pipeline id on deals.
                        Empty/legacy pipelines use the default stages below.
                      </small>
                    </label>
                    <label className="full">
                      Ordered stages (JSON array)
                      <textarea
                        className="mono"
                        rows={13}
                        name="stages"
                        defaultValue={JSON.stringify(s.stages, null, 2)}
                      />
                      <small>
                        Each stage needs a unique id, name, and probability
                        (0–100). Qualification remains separate from deal
                        stages.
                      </small>
                    </label>
                    {(
                      [
                        ["lostReasons", "Lost reasons"],
                        ["leadSources", "Lead sources"],
                        ["tags", "Tags"],
                      ] as const
                    ).map(([k, label]) => (
                      <label key={k}>
                        {label} (one per line)
                        <textarea
                          name={k}
                          rows={6}
                          defaultValue={s[k].join("\n")}
                        />
                      </label>
                    ))}
                  </>
                )}
                {tab === "Custom fields" && (
                  <>
                    <p className="hint full">
                      Custom values are validated in forms and again on the
                      server. Supported types: text, number, date, select,
                      multi-select, checkbox.
                    </p>
                    <label className="full">
                      Field definitions (JSON array)
                      <textarea
                        name="customFields"
                        className="mono"
                        rows={18}
                        defaultValue={JSON.stringify(s.customFields, null, 2)}
                        spellCheck={false}
                      />
                    </label>
                    <pre className="config-example full">
                      {JSON.stringify(
                        [
                          {
                            key: "region",
                            label: "Region",
                            kind: "lead",
                            type: "select",
                            required: false,
                            options: ["Americas", "EMEA", "APAC"],
                          },
                        ],
                        null,
                        2,
                      )}
                    </pre>
                  </>
                )}
              </div>
              <button className="button primary" disabled={busy}>
                <Save size={16} />
                {busy ? "Saving…" : "Save changes"}
              </button>
            </form>
          )}
          {tab === "Team" && (
            <>
              <p className="muted">
                Invite teammates and control access. Role changes revoke active
                sessions.
              </p>
              <div className="member-list">
                {bootstrap.members.map((m) => (
                  <form
                    key={m.userId}
                    className="member-row"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      await run(
                        () =>
                          mutate(
                            "members",
                            {
                              userId: m.userId,
                              role: f.get("role"),
                              team: f.get("team"),
                            },
                            "PATCH",
                          ),
                        "Member access updated.",
                      );
                    }}
                  >
                    <span className="avatar mint">{initials(m.name)}</span>
                    <span className="member-name">
                      <strong>{m.name}</strong>
                      <small>{m.email}</small>
                    </span>
                    <label>
                      <span className="sr-only">Team for {m.name}</span>
                      <input
                        name="team"
                        defaultValue={m.team}
                        required
                        disabled={m.userId === bootstrap.viewer.userId}
                      />
                    </label>
                    <label>
                      <span className="sr-only">Role for {m.name}</span>
                      <select
                        name="role"
                        defaultValue={m.role}
                        disabled={m.userId === bootstrap.viewer.userId}
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MANAGER">Manager</option>
                        <option value="REP">Sales rep</option>
                      </select>
                    </label>
                    <button
                      className="icon-button"
                      disabled={m.userId === bootstrap.viewer.userId || busy}
                      aria-label={`Save access for ${m.name}`}
                    >
                      <Check size={17} />
                    </button>
                    {m.userId !== bootstrap.viewer.userId && (
                      <button
                        type="button"
                        className="text-button danger"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Remove ${m.name} from this workspace?`,
                            )
                          )
                            run(
                              () =>
                                mutate(
                                  "members",
                                  { userId: m.userId },
                                  "DELETE",
                                ),
                              "Member removed.",
                            );
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </form>
                ))}
              </div>
              <h3>Invite a teammate</h3>
              <form
                className="form-grid"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  setBusy(true);
                  try {
                    const r = await mutate<{ url: string; detail: string }>(
                      "members",
                      {
                        email: f.get("email"),
                        role: f.get("role"),
                        team: f.get("team"),
                        sendEmail: f.get("sendEmail") === "on",
                      },
                    );
                    setNotice(`${r.detail} Invitation link: ${r.url}`);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  Email
                  <input name="email" type="email" required />
                </label>
                <label>
                  Team
                  <input name="team" defaultValue="Sales" required />
                </label>
                <label>
                  Role
                  <select name="role">
                    <option value="REP">Sales representative</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </label>
                <label className="check-label full">
                  <input name="sendEmail" type="checkbox" />
                  Email the invitation through the configured provider
                </label>
                <div className="align-end">
                  <button className="button primary" disabled={busy}>
                    <Plus size={15} />
                    Create invitation
                  </button>
                </div>
              </form>
            </>
          )}
          {tab === "Integrations" && (
            <>
              <p className="info-notice">
                Mode: {bootstrap.integrationMode}. Configured credentials do not
                prove provider connectivity. Development adapters never deliver
                messages.
              </p>
              {[
                {
                  name: "Resend email",
                  text: "Set INTEGRATION_MODE=live, RESEND_API_KEY and EMAIL_FROM in the server environment. Outbound sending and password reset use this adapter.",
                },
                {
                  name: "Google Calendar",
                  text: "Connect your personal calendar from Account & connections. OAuth credentials are configured on the server.",
                },
                {
                  name: "Microsoft Outlook",
                  text: "Connect your personal calendar from Account & connections. Linked CRM task title/time changes sync in both directions.",
                },
              ].map((p) => (
                <div className="integration-row" key={p.name}>
                  <div>
                    <h3>{p.name}</h3>
                    <p>{p.text}</p>
                  </div>
                  <span className="badge amber">
                    {p.name === "Resend email"
                      ? "Check server config"
                      : "Disconnected"}
                  </span>
                </div>
              ))}
              <h3>WhatsApp Business · encrypted credentials</h3>
              {connections.map((c) => (
                <div className="integration-row" key={c.id}>
                  <p>
                    {c.provider} · account {c.externalAccountId}
                    <br />
                    Configured, not connection-verified
                  </p>
                  <button
                    className="button secondary"
                    onClick={() =>
                      run(
                        () =>
                          mutate(
                            "integrations",
                            { provider: c.provider },
                            "DELETE",
                          ),
                        "Disconnected. Refresh this section to update the connection list.",
                      )
                    }
                  >
                    <Unplug size={15} />
                    Disconnect
                  </button>
                </div>
              ))}
              <form
                className="form-grid"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  await run(
                    () =>
                      mutate("integrations", {
                        provider: "whatsapp",
                        ...Object.fromEntries(f),
                      }),
                    "Credentials encrypted and saved. Configure the verified webhook before enabling live sending.",
                  );
                  e.currentTarget?.reset();
                }}
              >
                {[
                  ["phoneNumberId", "Phone number ID"],
                  ["accessToken", "Access token"],
                  ["appSecret", "App secret"],
                  ["verifyToken", "Webhook verify token"],
                ].map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      name={key}
                      type={key === "phoneNumberId" ? "text" : "password"}
                      autoComplete="off"
                      required
                      minLength={
                        key === "phoneNumberId"
                          ? 1
                          : key === "appSecret"
                            ? 16
                            : 20
                      }
                    />
                  </label>
                ))}
                <p className="hint full">
                  Webhook: /api/webhooks/whatsapp/PHONE_NUMBER_ID. HTTPS is
                  required in deployment. Only official approved template
                  messages are supported.
                </p>
                <button className="button primary" disabled={busy}>
                  <Save size={15} />
                  Save credentials
                </button>
              </form>
            </>
          )}
          {tab === "API access" && (
            <>
              <IntegrationTools orgId={bootstrap.organization.id} />
              <p>
                Capture keys allow server-side lead creation. Use a backend form
                proxy; never place API keys in embeddable browser code.
              </p>
              <button
                className="button primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    setCaptureKey(await mutate("capture-keys", {}));
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Plus size={15} />
                Create capture key
              </button>
              {captureKey && (
                <div className="key-result">
                  <p>Copy now. The server only stores a hash.</p>
                  <label>
                    Key
                    <input readOnly value={captureKey.key} />
                  </label>
                  <button
                    className="button secondary"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(captureKey.key)
                        .catch(() =>
                          setError(
                            "Clipboard unavailable; select and copy the key.",
                          ),
                        )
                    }
                  >
                    <Copy size={15} />
                    Copy key
                  </button>
                  <p>
                    Endpoint: <code>/api/capture/{captureKey.id}</code>
                  </p>
                  <button
                    className="button danger-button"
                    onClick={() =>
                      run(
                        () =>
                          mutate(
                            "capture-keys",
                            { id: captureKey.id },
                            "DELETE",
                          ),
                        "Key revoked.",
                      )
                    }
                  >
                    Revoke this key
                  </button>
                </div>
              )}
              <pre className="config-example">
                {
                  'POST /api/capture/KEY_ID\nAuthorization: Bearer YOUR_KEY\nContent-Type: application/json\n\n{"title":"New customer","data":{"email":"person@example.com","source":"Website"}}'
                }
              </pre>
            </>
          )}
          {tab === "Audit log" && (
            <>
              <p className="muted">
                Latest 200 events. Audit history has no ordinary edit or delete
                API.
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Entity</th>
                      <th>Actor</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audits.map((a) => (
                      <tr key={String(a.id)}>
                        <td>{String(a.action)}</td>
                        <td className="mono">{String(a.entityId)}</td>
                        <td>
                          {bootstrap.members.find((m) => m.userId === a.actorId)
                            ?.name ?? String(a.actorId)}
                        </td>
                        <td>
                          {new Date(String(a.createdAt)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {tab === "Data protection" && (
            <>
              <RetentionTools />
              <h3>Your data stays in your workspace</h3>
              <p>
                Records support soft deletion and restore. Permanent purge is an
                administrator-operated maintenance procedure. The retention
                period defines a review window, not an automatic deletion
                schedule.
              </p>
              <p>
                Attachments are private, require record access, and use
                one-minute signed download links after malware scanning. A
                missing scanner keeps uploads quarantined.
              </p>
              <h3>Backups and restore</h3>
              <p>
                No managed backup schedule has been configured. See
                docs/OPERATIONS.md for PostgreSQL dump, encrypted offsite
                storage, document backup, and restore verification procedures.
              </p>
              <h3>Security boundaries</h3>
              <p>
                ES256 signs session tokens. Argon2id hashes passwords.
                AES-256-GCM protects integration credentials with tenant-bound
                metadata. The keys live in server configuration, separate from
                the database.
              </p>
              <p className="hint">
                MFA and recovery codes are available in Account & connections.
                Legal e-signatures and tax compliance certification are outside
                the scope of this CRM.
              </p>
            </>
          )}
        </section>
      </div>
    </>
  );
}
