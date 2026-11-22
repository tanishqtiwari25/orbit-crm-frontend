"use client";
import { useEffect, useState } from "react";
import {
  Pencil,
  Trash2,
  ArrowUpRight,
  Plus,
  Download,
  GitMerge,
  Repeat2,
  Send,
  Paperclip,
  Play,
  Pause,
  MessageSquare,
  Phone,
  Calendar,
  Check,
} from "lucide-react";
import { Dialog, ErrorNotice, Empty } from "@/frontend/shared/ui/dialog";
import { api, mutate } from "@/frontend/shared/api/client";
import {
  initials,
  money,
  statusLabel,
  displayDate,
  type Bootstrap,
  type CrmRecord,
  type Data,
  type Activity,
} from "@/frontend/entities/crm";
export function RecordDetail({
  record: initial,
  bootstrap,
  onClose,
  onEdit,
  onChanged,
  onOpen,
  onNewTask,
}: {
  record: CrmRecord;
  bootstrap: Bootstrap;
  onClose: () => void;
  onEdit: (r: CrmRecord) => void;
  onChanged: () => void;
  onOpen: (r: CrmRecord) => void;
  onNewTask: (id: string) => void;
}) {
  const [r, setR] = useState(initial);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [docs, setDocs] = useState<
    { id: string; name: string; scanStatus: string }[]
  >([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("Activity");
  const [notice, setNotice] = useState("");
  const [score, setScore] = useState<{
    score: number;
    computed: number;
    contributions: Record<string, number>;
    decay: number;
    temperature: string;
    reason?: string;
  } | null>(null);
  const [mergeId, setMergeId] = useState("");
  const [target, setTarget] = useState<CrmRecord | null>(null);
  const [templates, setTemplates] = useState<CrmRecord[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [channel, setChannel] = useState("email");
  const [related, setRelated] = useState<CrmRecord[]>([]);
  async function reload() {
    const d = await api<{ record: CrmRecord; score: typeof score }>(
      `records/${r.id}`,
    );
    setR(d.record);
    setScore(d.score);
    const a = await api<{ activities: Activity[]; documents: typeof docs }>(
      `records/${r.id}/activities${filter ? `?type=${filter}` : ""}`,
    );
    setActivities(a.activities);
    setDocs(a.documents);
  }
  useEffect(() => {
    let ignore = false;
    Promise.all([
      api<{ record: CrmRecord; score: typeof score }>(`records/${initial.id}`),
      api<{ activities: Activity[]; documents: typeof docs }>(
        `records/${initial.id}/activities${filter ? `?type=${filter}` : ""}`,
      ),
    ])
      .then(([d, a]) => {
        if (!ignore) {
          setR(d.record);
          setScore(d.score);
          setActivities(a.activities);
          setDocs(a.documents);
        }
      })
      .catch((e) => setError(e.message));
    return () => {
      ignore = true;
    };
  }, [initial.id, filter]);
  const run = async (fn: () => Promise<unknown>, message?: string) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      window.dispatchEvent(new Event("orbit-work-changed"));
      if (message) setNotice(message);
      await reload();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const openRelated = async () => {
    const records: CrmRecord[] = [];
    for (const kind of [
      "lead",
      "contact",
      "company",
      "deal",
      "task",
      "quotation",
    ] as const) {
      const list = await api<{ records: CrmRecord[] }>(
        `records?kind=${kind}&limit=200`,
      );
      records.push(
        ...list.records.filter(
          (x) =>
            x.id !== r.id &&
            (Object.values(x.data).includes(r.id) ||
              Object.values(r.data).includes(x.id)),
        ),
      );
    }
    setRelated(records);
    setTab("Related");
  };
  return (
    <Dialog
      title={`${r.kind[0].toUpperCase() + r.kind.slice(1)} details`}
      onClose={onClose}
      wide
    >
      <div className="detail-heading">
        <span className="avatar large mint">{initials(r.title)}</span>
        <div>
          <h2>{r.title}</h2>
          <p className="muted">
            {String(r.data.company ?? r.data.email ?? "Workspace record")}
          </p>
          <span className="badge green">
            {statusLabel(r, bootstrap.organization.settings)}
          </span>
        </div>
        <button className="button secondary" onClick={() => onEdit(r)}>
          <Pencil size={14} />
          Edit
        </button>
      </div>
      {error && <ErrorNotice message={error} />}{" "}
      {notice && (
        <p className="success-notice" role="status">
          {notice}
        </p>
      )}
      <div className="detail-actions">
        {r.kind === "task" &&
          r.status === "Pending" &&
          r.ownerId === bootstrap.viewer.userId && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() =>
                run(
                  () => mutate("work-focus", { action: "start", taskId: r.id }),
                  "Focus started. Your team can see this task in Live team monitoring.",
                )
              }
            >
              <Play size={15} />
              Start focus
            </button>
          )}
        {r.kind === "lead" && !["Converted", "Merged"].includes(r.status) && (
          <button
            disabled={busy}
            className="button secondary"
            onClick={() => {
              if (
                window.confirm(
                  "Convert this lead into a contact and company, and create a deal? All history remains linked.",
                )
              )
                run(
                  () => mutate(`records/${r.id}/convert`, { createDeal: true }),
                  "Lead converted. Open Related records to continue.",
                );
            }}
          >
            <ArrowUpRight size={15} />
            Convert lead
          </button>
        )}
        {r.kind === "task" && r.status === "Pending" && (
          <button
            className="button primary"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  mutate(
                    `records/${r.id}`,
                    {
                      kind: r.kind,
                      title: r.title,
                      status: "Completed",
                      ownerId: r.ownerId,
                      data: r.data,
                      version: r.version,
                    },
                    "PATCH",
                  ),
                "Task completed.",
              )
            }
          >
            <Check size={15} />
            Complete task
          </button>
        )}
        {r.kind === "quotation" && (
          <>
            <a className="button secondary" href={`/api/records/${r.id}/pdf`}>
              <Download size={15} />
              Download PDF
            </a>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() =>
                run(
                  () => mutate(`records/${r.id}/revision`, {}),
                  "Draft revision created.",
                )
              }
            >
              <Repeat2 size={15} />
              New revision
            </button>
            <button
              className="button secondary"
              onClick={() => setTab("Quotation")}
            >
              Update status
            </button>
          </>
        )}
        {r.kind === "workflow" && (
          <>
            <button
              className="button secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const d = await mutate<{
                    matching: { title: string }[];
                    sampleSize: number;
                    total: number;
                    nextRunAt: string;
                    workflow: CrmRecord;
                  }>(`records/${r.id}/preview`, {});
                  setR(d.workflow);
                  setNotice(
                    `Preview only: ${d.matching.length} matches among ${d.sampleSize} of ${d.total} records. Next eligible time: ${new Date(d.nextRunAt).toLocaleString()}. No actions executed.`,
                  );
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Play size={15} />
              Preview workflow
            </button>
            <button
              className="button primary"
              disabled={busy || (!r.data.enabled && !r.data.testedAt)}
              onClick={() =>
                run(
                  () =>
                    mutate(
                      `records/${r.id}`,
                      {
                        kind: r.kind,
                        title: r.title,
                        status: r.data.enabled ? "Paused" : "Active",
                        ownerId: r.ownerId,
                        data: { ...r.data, enabled: !r.data.enabled },
                        version: r.version,
                      },
                      "PATCH",
                    ),
                  "Workflow updated.",
                )
              }
            >
              <Pause size={15} />
              {r.data.enabled ? "Pause" : "Enable"} workflow
            </button>
          </>
        )}
        <button className="button secondary" onClick={() => onNewTask(r.id)}>
          <Plus size={15} />
          Add follow-up
        </button>
        {bootstrap.viewer.role !== "REP" && (
          <button
            className="button ghost danger"
            disabled={busy}
            onClick={async () => {
              if (
                !window.confirm(
                  `Move “${r.title}” to trash? An administrator or manager can restore it.`,
                )
              )
                return;
              setBusy(true);
              try {
                await api(`records/${r.id}`, { method: "DELETE" });
                onChanged();
                onClose();
              } catch (e) {
                setError((e as Error).message);
                setBusy(false);
              }
            }}
          >
            <Trash2 size={15} />
            Delete
          </button>
        )}
      </div>
      <div className="tabs">
        <button
          className={tab === "Activity" ? "selected" : ""}
          onClick={() => setTab("Activity")}
        >
          Activity
        </button>
        <button
          className={tab === "Details" ? "selected" : ""}
          onClick={() => setTab("Details")}
        >
          Details {score && `· ${score.temperature}`}
        </button>
        <button
          className={tab === "Related" ? "selected" : ""}
          onClick={() => openRelated().catch((e) => setError(e.message))}
        >
          Related records
        </button>
        <button
          className={tab === "Documents" ? "selected" : ""}
          onClick={() => setTab("Documents")}
        >
          Documents ({docs.length})
        </button>
        {["lead", "contact"].includes(r.kind) && (
          <button
            className={tab === "Compose" ? "selected" : ""}
            onClick={async () => {
              setTab("Compose");
              try {
                setTemplates(
                  (
                    await api<{ records: CrmRecord[] }>(
                      "records?kind=template&limit=200",
                    )
                  ).records,
                );
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Compose
          </button>
        )}
        {r.kind === "lead" && bootstrap.viewer.role !== "REP" && (
          <button
            className={tab === "Merge" ? "selected" : ""}
            onClick={() => setTab("Merge")}
          >
            Merge
          </button>
        )}
      </div>
      {tab === "Activity" && (
        <>
          <form
            className="activity-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = new FormData(form);
              await run(() =>
                mutate(`records/${r.id}/activities`, {
                  type: data.get("type"),
                  body: data.get("body"),
                }),
              );
              form.reset();
            }}
          >
            <label>
              Log an activity
              <select name="type">
                <option value="note">Note</option>
                <option value="call">Call outcome</option>
                <option value="meeting">Meeting</option>
              </select>
            </label>
            <label className="grow">
              Activity details
              <textarea
                required
                name="body"
                rows={2}
                maxLength={10000}
                placeholder="Write a note or outcome. Mention a teammate with @person@company.com."
              />
            </label>
            <button className="button primary" disabled={busy}>
              <Plus size={15} />
              Add
            </button>
          </form>
          <div className="section-header">
            <h3>Timeline</h3>
            <label className="sr-only" htmlFor="activity-filter">
              Filter activity
            </label>
            <select
              id="activity-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">All activities</option>
              {[
                "note",
                "call",
                "meeting",
                "email",
                "whatsapp",
                "change",
                "conversion",
                "merge",
                "automation",
                "notification",
                "delivery",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          {activities.map((a) => (
            <div key={a.id} className="timeline-entry">
              <span className="timeline-icon">
                {a.type === "call" ? (
                  <Phone size={15} />
                ) : a.type === "meeting" ? (
                  <Calendar size={15} />
                ) : (
                  <MessageSquare size={15} />
                )}
              </span>
              <div>
                <div className="timeline-meta">
                  <strong>{a.type}</strong>
                  <small>
                    {new Date(a.createdAt).toLocaleString("en-US", {
                      timeZone: bootstrap.organization.settings.timezone,
                    })}
                  </small>
                </div>
                <p>{a.body}</p>
              </div>
            </div>
          ))}
          {!activities.length && (
            <Empty
              title="Start the conversation"
              detail="Notes, calls, messages and record changes appear here."
            />
          )}
        </>
      )}
      {tab === "Details" && (
        <>
          <dl className="detail-grid">
            <div>
              <dt>Record ID</dt>
              <dd className="mono">{r.id}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>
                {bootstrap.members.find((m) => m.userId === r.ownerId)?.name ??
                  "Former member"}
              </dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{displayDate(r.createdAt)}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>
                {displayDate(r.updatedAt)} · version {r.version}
              </dd>
            </div>
            {Object.entries(r.data)
              .filter(([k]) => !["items", "revisions", "custom"].includes(k))
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k.replace(/([A-Z])/g, " $1")}</dt>
                  <dd>
                    {typeof v === "boolean"
                      ? v
                        ? "Yes"
                        : "No"
                      : Array.isArray(v)
                        ? v.join(", ")
                        : typeof v === "object"
                          ? JSON.stringify(v)
                          : String(v ?? "—")}
                  </dd>
                </div>
              ))}
          </dl>
          {score && (
            <section className="score-panel">
              <h3>
                Lead score{" "}
                <span className="badge green">
                  {score.score} / 100 · {score.temperature}
                </span>
              </h3>
              <p className="hint">
                Rules-based calculation. Weights are configured by your
                administrator.
              </p>
              {Object.entries(score.contributions).map(([k, n]) => (
                <div className="score-line" key={k}>
                  <span>{k}</span>
                  <progress max={100} value={n} />
                  <strong>+{n.toFixed(1)}</strong>
                </div>
              ))}
              <p>
                Inactivity decay: −{score.decay} · Computed score:{" "}
                {score.computed}
              </p>
              {score.reason && <p>Manual override: {score.reason}</p>}
            </section>
          )}
        </>
      )}
      {tab === "Related" && (
        <>
          {related.map((x) => (
            <button
              className="search-result"
              key={x.id}
              onClick={() => onOpen(x)}
            >
              <span className="avatar mint">{initials(x.title)}</span>
              <span>
                <strong>{x.title}</strong>
                <small>
                  {x.kind} · {x.status}
                </small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          ))}
          {!related.length && (
            <Empty
              title="No linked records yet"
              detail="Converted contacts, companies, deals and linked tasks will appear here."
            />
          )}
        </>
      )}
      {tab === "Documents" && (
        <>
          <p className="hint">
            PDF, PNG or JPEG · up to 5 MB. Uploaded files stay quarantined until
            the configured malware scanner approves them.
          </p>
          <label className="upload-zone">
            <Paperclip size={20} />
            <strong>Attach a document</strong>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const form = new FormData();
                form.set("file", f);
                form.set("recordId", r.id);
                await run(
                  () => api("files", { method: "POST", body: form }),
                  "Attachment stored privately. Check its scan status before download.",
                );
              }}
            />
          </label>
          {docs.map((d) => (
            <div className="document-row" key={d.id}>
              <Paperclip size={17} />
              <strong>{d.name}</strong>
              <span
                className={`badge ${d.scanStatus === "clean" ? "green" : "amber"}`}
              >
                {d.scanStatus}
              </span>
              <button
                className="button secondary"
                disabled={d.scanStatus !== "clean"}
                onClick={async () => {
                  try {
                    const link = await api<{ url: string }>(`files/${d.id}`);
                    window.location.assign(link.url);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <Download size={14} />
                Download
              </button>
            </div>
          ))}
        </>
      )}
      {tab === "Compose" && (
        <form
          className="record-form"
          onSubmit={async (e) => {
            e.preventDefault();
            await run(
              () =>
                mutate(`records/${r.id}/message`, {
                  channel,
                  templateId,
                  idempotencyKey: crypto.randomUUID(),
                }),
              bootstrap.integrationMode === "live"
                ? "Queued for provider processing. Delivery status will appear in the timeline."
                : "Development adapter: recorded locally, no message delivered.",
            );
          }}
        >
          <p className="info-notice">
            {bootstrap.integrationMode === "live"
              ? "Sending requires recorded consent and configured credentials."
              : "Development mode. Messages are recorded locally and never delivered."}
          </p>
          <label>
            Channel
            <select
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value);
                setTemplateId("");
              }}
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp Business</option>
            </select>
          </label>
          <label>
            Template
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              required
            >
              <option value="">Choose a template</option>
              {templates
                .filter((t) => t.data.channel === channel)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
          </label>
          {templateId && (
            <pre className="message-preview">
              {String(
                templates.find((t) => t.id === templateId)?.data.body ?? "",
              )
                .replaceAll("{{name}}", r.title)
                .replaceAll("{{company}}", String(r.data.company ?? ""))}
            </pre>
          )}
          <button className="button primary" disabled={busy || !templateId}>
            <Send size={15} />
            {bootstrap.integrationMode === "live"
              ? "Queue message"
              : "Record development message"}
          </button>
        </form>
      )}
      {tab === "Merge" && (
        <>
          <p>
            Merge this source lead into a reviewed destination. The destination
            keeps populated fields; related activities, documents and record
            links move with the history. Consent is never broadened.
          </p>
          <form
            className="search-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              try {
                const d = await api<{ record: CrmRecord }>(
                  `records/${encodeURIComponent(mergeId)}`,
                );
                if (d.record.kind !== "lead" || d.record.id === r.id)
                  throw new Error("Choose a different lead.");
                setTarget(d.record);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <label>
              Destination lead ID
              <input
                value={mergeId}
                onChange={(e) => {
                  setMergeId(e.target.value);
                  setTarget(null);
                }}
                required
              />
            </label>
            <button className="button secondary">Review destination</button>
          </form>
          {target && (
            <div className="merge-review">
              <h3>Review this merge</h3>
              <p>
                <strong>{r.title}</strong> → <strong>{target.title}</strong>
              </p>
              <p>
                Destination email: {String(target.data.email ?? "—")}
                <br />
                Destination company: {String(target.data.company ?? "—")}
              </p>
              <button
                className="button danger-button"
                disabled={busy}
                onClick={async () => {
                  if (
                    !window.confirm(
                      "Confirm this merge? The source will be archived and its history moved.",
                    )
                  )
                    return;
                  setBusy(true);
                  try {
                    const merged = await mutate<CrmRecord>(
                      `records/${r.id}/merge`,
                      { targetId: target.id, reviewed: true },
                    );
                    onChanged();
                    onOpen(merged);
                  } catch (e) {
                    setError((e as Error).message);
                    setBusy(false);
                  }
                }}
              >
                <GitMerge size={15} />
                Confirm merge
              </button>
            </div>
          )}
        </>
      )}
      {tab === "Quotation" && (
        <>
          {r.status === "Draft" && (
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                run(
                  () => mutate(`records/${r.id}/quotation-email`, {}),
                  "PDF email queued. Check timeline and Monitoring for provider status. Development mode does not deliver email.",
                )
              }
            >
              Email quotation PDF
            </button>
          )}
          <p className="info-notice">
            “Sent” records a quotation you sent externally. Orbit does not claim
            delivery or a legally binding signature.
          </p>
          <label>
            New status
            <select id="quotation-new-status" defaultValue={r.status}>
              {["Draft", "Sent", "Accepted", "Rejected", "Expired"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Explanation
            <input
              id="quotation-status-note"
              minLength={5}
              placeholder="How was it sent or confirmed?"
            />
          </label>
          <button
            className="button primary"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  mutate(`records/${r.id}/quotation-status`, {
                    status: (
                      document.getElementById(
                        "quotation-new-status",
                      ) as HTMLSelectElement
                    ).value,
                    note: (
                      document.getElementById(
                        "quotation-status-note",
                      ) as HTMLInputElement
                    ).value,
                    externallySent: true,
                  }),
                "Quotation status recorded.",
              )
            }
          >
            Record status
          </button>
          {Array.isArray(r.data.revisions) && (
            <div>
              <h3>Version history</h3>
              {(r.data.revisions as Data[]).map((v, i) => (
                <p key={i}>
                  Version {String(v.version)} · {String(v.status)} ·{" "}
                  {String(v.at)}
                </p>
              ))}
            </div>
          )}
        </>
      )}
      {r.kind === "deal" && (
        <p className="detail-value">
          {money(r.data.amount, String(r.data.currency ?? "USD"))}
          <small> · {String(r.data.probability ?? 0)}% probability</small>
        </p>
      )}
    </Dialog>
  );
}
