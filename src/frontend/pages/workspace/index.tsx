"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  Plus,
  Download,
  Upload,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Check,
  RefreshCw,
  Filter,
  Bookmark,
  Trash2,
  RotateCcw,
  ArrowRight,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/frontend/widgets/app-shell";
import { RecordEditor } from "@/frontend/features/record-editor";
import { RecordDetail } from "@/frontend/features/record-detail";
import { LeadImport } from "@/frontend/features/lead-import";
import { WorkspaceSettings } from "@/frontend/features/workspace-settings";
import { RelationshipExplorer } from "@/frontend/features/relationship-explorer";
import {
  TeamMonitoring,
  PersonalWorkspace,
} from "@/frontend/features/team-monitoring";
import {
  sectionKind,
  allStages,
  pipelineStages,
  kindLabel,
  initials,
  money,
  displayDate,
  statusLabel,
  type Bootstrap,
  type CrmRecord,
  type Kind,
  type Data,
} from "@/frontend/entities/crm";
import { api, mutate } from "@/frontend/shared/api/client";
import { Empty, ErrorNotice } from "@/frontend/shared/ui/dialog";
import { Dashboard } from "./dashboard";
import type { Report } from "./model";
const copy: Record<
  string,
  { title: string; tagline: string; eyebrow: string }
> = {
  leads: {
    title: "Every connection starts here.",
    tagline: "Find the right people. Make the next move.",
    eyebrow: "YOUR NEXT OPPORTUNITY",
  },
  contacts: {
    title: "People, not just profiles.",
    tagline: "Keep your most valuable relationships close.",
    eyebrow: "THE PEOPLE IN YOUR ORBIT",
  },
  companies: {
    title: "Good company, great possibilities.",
    tagline: "A clearer view of the businesses you work with.",
    eyebrow: "BUILT ON RELATIONSHIPS",
  },
  deals: {
    title: "Keep good things moving.",
    tagline: "From the first conversation to the final handshake.",
    eyebrow: "YOUR SALES PIPELINE",
  },
  tasks: {
    title: "A thoughtful next step.",
    tagline: "The little follow-ups that make a big difference.",
    eyebrow: "MAKE TIME FOR WHAT MATTERS",
  },
  calendar: {
    title: "Make room for connection.",
    tagline: "Your calls, meetings, and next steps in one place.",
    eyebrow: "YOUR TIME, WELL SPENT",
  },
  quotations: {
    title: "Put your best offer forward.",
    tagline: "Clear proposals. Confident next steps.",
    eyebrow: "FROM POSSIBILITY TO PROPOSAL",
  },
  automations: {
    title: "Give your team time back.",
    tagline: "Thoughtful workflows for the work that repeats.",
    eyebrow: "LESS BUSYWORK, MORE MOMENTUM",
  },
  products: {
    title: "Everything you bring to the table.",
    tagline: "Your products and services, ready for the next opportunity.",
    eyebrow: "THE PRODUCT CATALOG",
  },
  templates: {
    title: "The right words, ready.",
    tagline: "Make every message feel a little more personal.",
    eyebrow: "MEANINGFUL COMMUNICATION",
  },
};
export function WorkspacePage({ section }: { section: string }) {
  const [b, setB] = useState<Bootstrap | null>(null);
  const [records, setRecords] = useState<CrmRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const [dashboardData, setDashboardData] = useState<{
    leads: CrmRecord[];
    tasks: CrmRecord[];
    deals: CrmRecord[];
  }>({ leads: [], tasks: [], deals: [] });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [editor, setEditor] = useState<{
    kind: Kind;
    record?: CrmRecord;
    relatedId?: string;
    initialOwnerId?: string;
  } | null>(null);
  const [detail, setDetail] = useState<CrmRecord | null>(null);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState("");
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("");
  const [owner, setOwner] = useState("");
  const [team, setTeam] = useState("");
  const [source, setSource] = useState("");
  const [pipeline, setPipeline] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("updatedAt");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState(section === "deals" ? "board" : "table");
  const [due, setDue] = useState("");
  const [deleted, setDeleted] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [savedViews, setSavedViews] = useState<CrmRecord[]>([]);
  const [live, setLive] = useState(false);
  const [kind, setKind] = useState<Kind | undefined>(sectionKind[section]);
  const [communications, setCommunications] = useState<Data[]>([]);
  const [monitor, setMonitor] = useState<{
    worker: { healthy: boolean; lastSeen: string | null };
    queue: Record<string, number>;
    jobs: Data[];
    alerts: { id: string; message: string }[];
    requestMetrics: {
      requests: number;
      errors: number;
      durationMs: number;
      maxDurationMs: number;
    }[];
  } | null>(null);
  const [calendarOffset, setCalendarOffset] = useState(0);
  const revision = useRef("");
  const refresh = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(searchInput);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setStatus(p.get("status") ?? "");
    setKind(sectionKind[section]);
    setPage(1);
    setSelection([]);
    setRecords([]);
    setTotal(0);
    setSearchInput("");
    setQ("");
    setOwner("");
    setTeam("");
    setSource("");
    setPipeline("");
    setFrom("");
    setTo("");
    setDue("");
    setDeleted(false);
    setSort("updatedAt");
    setView(section === "deals" ? "board" : "table");
    setShowFilters(false);
    setEditor(null);
    setDetail(null);
    setImporting(false);
  }, [section]);
  const filters = new URLSearchParams({
    ...(q ? { query: q } : {}),
    ...(status ? { status } : {}),
    ...(owner ? { owner } : {}),
    ...(team ? { team } : {}),
    ...(source ? { source } : {}),
    ...(pipeline ? { pipeline } : {}),
    ...(from ? { from: new Date(`${from}T00:00:00Z`).toISOString() } : {}),
    ...(to ? { to: new Date(`${to}T23:59:59Z`).toISOString() } : {}),
    ...(due ? { due } : {}),
    sort,
    page: String(page),
    limit: section === "deals" || section === "calendar" ? "200" : "25",
    deleted: String(deleted),
  }).toString();
  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const bootstrap = await api<Bootstrap>("bootstrap");
        if (ignore) return;
        setB(bootstrap);
        if (kind) {
          const result = await api<{ records: CrmRecord[]; total: number }>(
            `records?kind=${kind}&${filters}`,
          );
          if (!ignore) {
            setRecords(result.records);
            setTotal(result.total);
          }
        }
        if (section === "dashboard" || section === "reports") {
          const r = await api<Report>(`reports?${filters}`);
          if (!ignore) setReport(r);
        }
        if (section === "dashboard") {
          const [leads, tasks, deals] = await Promise.all(
            (["lead", "task", "deal"] as const).map((k) =>
              api<{ records: CrmRecord[] }>(`records?kind=${k}&limit=100`),
            ),
          );
          if (!ignore)
            setDashboardData({
              leads: leads.records,
              tasks: tasks.records,
              deals: deals.records,
            });
        }
        if (section === "leads") {
          const r = await api<{ records: CrmRecord[] }>(
            "records?kind=view&limit=100",
          );
          if (!ignore)
            setSavedViews(r.records.filter((x) => x.data.kind === "lead"));
        }
        if (section === "communications") {
          const r = await api<{ activities: Data[] }>("communications");
          if (!ignore) setCommunications(r.activities);
        }
        if (section === "monitoring") {
          const r = await api<NonNullable<typeof monitor>>("monitoring");
          if (!ignore) setMonitor(r);
        }
      } catch (e) {
        if (!ignore) setError((e as Error).message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [section, kind, filters, reloadKey]);
  const activeOrg = b?.viewer.orgId;
  useEffect(() => {
    if (!activeOrg) return;
    const events = new EventSource("/api/events");
    events.addEventListener("heartbeat", (e) => {
      setLive(true);
      const d = JSON.parse((e as MessageEvent).data);
      if (revision.current && revision.current !== d.revision) refresh();
      revision.current = d.revision;
    });
    events.onerror = () => setLive(false);
    return () => events.close();
  }, [activeOrg, refresh]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  const change = () => {
    refresh();
    setSelection([]);
  };
  const onSaved = () => {
    setEditor(null);
    setDetail(null);
    change();
    setToast("Saved. Your workspace is up to date.");
  };
  const stageChange = async (r: CrmRecord, value: string) => {
    if (value === "lost") {
      setEditor({ kind: r.kind, record: { ...r, status: value } });
      return;
    }
    try {
      await mutate(
        `records/${r.id}`,
        {
          kind: r.kind,
          title: r.title,
          status: value,
          ownerId: r.ownerId,
          data: r.data,
          version: r.version,
        },
        "PATCH",
      );
      change();
    } catch (e) {
      setToast((e as Error).message);
    }
  };
  const markTask = (r: CrmRecord) =>
    stageChange(r, r.status === "Completed" ? "Pending" : "Completed");
  if (!b)
    return (
      <main className="loading-screen">
        {error ? (
          <>
            <h1>Your workspace needs attention</h1>
            <ErrorNotice message={error} />
            <button className="button primary" onClick={refresh}>
              Try again
            </button>
            <Link href="/login">Go to sign in</Link>
          </>
        ) : (
          <>
            <span className="brand-symbol" />
            <h2>Finding your orbit…</h2>
            <p>Loading your private workspace.</p>
          </>
        )}
      </main>
    );
  const s = b.organization.settings;
  const meta = copy[section];
  const add = () => setEditor({ kind: kind ?? "lead" });
  const openRecord = (r: CrmRecord) => {
    setDetail(r);
  };
  const controls = (
    <div className="filter-panel">
      <label>
        Owner
        <select
          value={owner}
          onChange={(e) => {
            setOwner(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Everyone visible</option>
          {b.members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Team
        <select
          value={team}
          onChange={(e) => {
            setTeam(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All teams</option>
          {[...new Set(b.members.map((m) => m.team))].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label>
        Source
        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All sources</option>
          {s.leadSources.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      {section === "deals" || section === "reports" ? (
        <label>
          Pipeline
          <input
            value={pipeline}
            onChange={(e) => {
              setPipeline(e.target.value);
              setPage(1);
            }}
            placeholder="All pipelines"
          />
        </label>
      ) : null}
      <label>
        Created from
        <input
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
        />
      </label>
      <label>
        Created through
        <input
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
        />
      </label>
      <button
        className="text-button"
        onClick={() => {
          setOwner("");
          setTeam("");
          setSource("");
          setFrom("");
          setTo("");
          setPipeline("");
          setStatus("");
          setPage(1);
        }}
      >
        Clear filters
      </button>
    </div>
  );
  let content: ReactNode;
  if (section === "dashboard" && report)
    content = (
      <>
        <Dashboard
          b={b}
          report={report}
          {...dashboardData}
          onRecord={openRecord}
          onAdd={() => setEditor({ kind: "lead" })}
        />
        {!Object.values(b.counts).some(Boolean) && (
          <div className="sample-banner">
            <div>
              <h3>A fresh workspace, ready for you.</h3>
              <p>
                Create your first lead, or explore with clearly labeled
                fictional sample data.
              </p>
            </div>
            {b.viewer.role === "ADMIN" && (
              <button
                className="button secondary"
                onClick={async () => {
                  try {
                    await mutate("seed", {});
                    change();
                    setToast("Fictional sample data added. No messages sent.");
                  } catch (e) {
                    setToast((e as Error).message);
                  }
                }}
              >
                Add fictional sample data
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        )}
      </>
    );
  else if (section === "settings")
    content =
      b.viewer.role === "ADMIN" ? (
        <WorkspaceSettings bootstrap={b} onChanged={refresh} />
      ) : (
        <Empty
          title="Administrator access required"
          detail="Ask your workspace administrator to manage these settings."
        />
      );
  else if (section === "reports" && report)
    content = (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">SEE THE BIGGER PICTURE</div>
            <h1>A clearer path forward.</h1>
            <p>
              Understand the people, patterns, and progress behind your numbers.
            </p>
          </div>
          <button
            className="button secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={15} />
            Filters
          </button>
        </div>
        {showFilters && controls}
        <div className="kpi-grid">
          {[
            ["Qualified leads", report.qualified],
            ["Win rate", `${report.winRate.toFixed(1)}%`],
            [
              "Sales cycle (approx.)",
              `${report.salesCycleDays.toFixed(1)} days`,
            ],
            ["Stalled deals", report.stalled],
          ].map(([label, value]) => (
            <div className="kpi-card" key={String(label)}>
              <span className="muted">{label}</span>
              <strong className="kpi-value">{value}</strong>
            </div>
          ))}
        </div>
        <div className="reports-grid">
          {[
            ["Lead sources", report.sources, "/leads"],
            ["Lead temperature", report.temperatures, "/leads"],
            ["Lost reasons", report.lostReasons, "/deals?status=lost"],
            [
              "Owner performance",
              report.owners.map((o) => ({
                ...o,
                name:
                  b.members.find((m) => m.userId === o.name)?.name ?? o.name,
              })),
              "/leads",
            ],
          ].map(([title, data, href]) => (
            <section className="panel" key={String(title)}>
              <div className="panel-heading">
                <h2>{String(title)}</h2>
                <Link href={String(href)} className="text-link">
                  Records
                  <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="report-bars">
                {(data as { name: string; count: number }[]).map((x, i) => (
                  <div className="report-bar" key={x.name}>
                    <span>{x.name}</span>
                    <div>
                      <i
                        className={`fill-${i % 4}`}
                        style={{
                          width: `${(x.count / Math.max(1, ...(data as { count: number }[]).map((x) => x.count))) * 100}%`,
                        }}
                      />
                    </div>
                    <strong>{x.count}</strong>
                  </div>
                ))}
                {!(data as unknown[]).length && (
                  <p className="muted">No matching records yet.</p>
                )}
              </div>
            </section>
          ))}
        </div>
        <section className="panel">
          <div className="panel-heading">
            <h2>Revenue by currency</h2>
            <span className="badge subtle">No FX conversion</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Currency</th>
                  <th>Open pipeline</th>
                  <th>Expected revenue</th>
                  <th>Won revenue</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(report.revenue).map(([c, r]) => (
                  <tr key={c}>
                    <td>{c}</td>
                    <td>{money(r.pipeline, c)}</td>
                    <td>{money(r.expected, c)}</td>
                    <td>{money(r.won, c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <h2>Response & team performance</h2>
          <p>
            Mean first response:{" "}
            {report.firstResponseHours == null
              ? "No recorded responses"
              : `${report.firstResponseHours.toFixed(1)} hours`}{" "}
            · {report.respondedLeads} responded leads ·{" "}
            {report.delayedResponses} waiting over 24 hours.
          </p>
          {(["ownerPerformance", "teamPerformance"] as const).map((key) => (
            <div className="table-scroll" key={key}>
              <h3>{key === "teamPerformance" ? "Teams" : "Owners"}</h3>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Leads</th>
                    <th>Qualified</th>
                    <th>Converted</th>
                    <th>Won deals</th>
                    <th>Lost deals</th>
                  </tr>
                </thead>
                <tbody>
                  {report[key].map((row) => (
                    <tr key={row.name}>
                      <td>
                        {key === "ownerPerformance"
                          ? (b.members.find((m) => m.userId === row.name)
                              ?.name ?? row.name)
                          : row.name}
                      </td>
                      <td>{row.leads}</td>
                      <td>{row.qualified}</td>
                      <td>{row.converted}</td>
                      <td>{row.won}</td>
                      <td>{row.lost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
        <details className="panel metric-definitions">
          <summary>How these metrics are calculated</summary>
          <dl>
            {Object.entries(report.definitions).map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </details>
      </>
    );
  else if (section === "my-work")
    content = (
      <PersonalWorkspace
        userId={b.viewer.userId}
        name={b.viewer.name}
        role={b.viewer.role}
        team={b.viewer.team}
        timezone={b.organization.settings.timezone}
        onTask={(id) => {
          api<{ record: CrmRecord }>(`records/${id}`)
            .then((r) => openRecord(r.record))
            .catch((e) => setToast(e.message));
        }}
      />
    );
  else if (section === "monitoring")
    content = (
      <>
        <TeamMonitoring
          viewerId={b.viewer.userId}
          ownerView={b.viewer.role === "ADMIN"}
          onTask={(id) => {
            api<{ record: CrmRecord }>(`records/${id}`)
              .then((r) => openRecord(r.record))
              .catch((e) => setToast(e.message));
          }}
          onAssign={(userId) =>
            setEditor({ kind: "task", initialOwnerId: userId })
          }
        />
        <details className="team-system-details">
          <summary>System health &amp; background jobs</summary>
          <div className="page-heading">
            <div>
              <div className="eyebrow">KEEP AN EYE ON YOUR ORBIT</div>
              <h2>System health &amp; background jobs</h2>
              <p>
                CRM operations and infrastructure health, clearly separated.
              </p>
            </div>
            <button className="button secondary" onClick={refresh}>
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>
          {monitor && (
            <>
              <div className="kpi-grid">
                <div className="kpi-card">
                  <span className="muted">Worker heartbeat</span>
                  <strong className="health-value">
                    {monitor.worker.healthy ? (
                      <CheckCircle2 size={25} />
                    ) : (
                      <AlertTriangle size={25} />
                    )}{" "}
                    {monitor.worker.healthy ? "Healthy" : "Not running"}
                  </strong>
                  <small>
                    Last seen:{" "}
                    {monitor.worker.lastSeen
                      ? new Date(monitor.worker.lastSeen).toLocaleString()
                      : "Never"}
                  </small>
                </div>
                {["pending", "running", "failed"].map((k) => (
                  <div className="kpi-card" key={k}>
                    <span className="muted">
                      {k[0].toUpperCase() + k.slice(1)} jobs
                    </span>
                    <strong className="kpi-value">
                      {monitor.queue[k] ?? 0}
                    </strong>
                  </div>
                ))}
              </div>
              <section className="panel">
                <h2>Workspace request metrics · last hour</h2>
                <p>
                  {monitor.requestMetrics.reduce((n, m) => n + m.requests, 0)}{" "}
                  authenticated requests ·{" "}
                  {monitor.requestMetrics.reduce((n, m) => n + m.errors, 0)}{" "}
                  server errors · mean latency{" "}
                  {Math.round(
                    monitor.requestMetrics.reduce(
                      (n, m) => n + m.durationMs,
                      0,
                    ) /
                      Math.max(
                        1,
                        monitor.requestMetrics.reduce(
                          (n, m) => n + m.requests,
                          0,
                        ),
                      ),
                  )}{" "}
                  ms · max latency{" "}
                  {Math.max(
                    0,
                    ...monitor.requestMetrics.map((m) => m.maxDurationMs),
                  )}{" "}
                  ms.
                </p>
                <h3>Active operational alerts</h3>
                {monitor.alerts.length ? (
                  monitor.alerts.map((a) => (
                    <p className="info-notice" key={a.id}>
                      {a.message}
                    </p>
                  ))
                ) : (
                  <p>
                    No active alerts. Configure thresholds in Workspace
                    settings.
                  </p>
                )}
              </section>
              <p className="info-notice">
                The worker is a separate process: <code>npm run worker</code>.
                Health probes are available at /api/health and
                /api/health/ready. Request latency is recorded in structured
                server logs.
              </p>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Automation & integration executions</h2>
                  <span>Latest 100 jobs</span>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Attempts</th>
                        <th>Details</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monitor.jobs.map((j) => (
                        <tr key={String(j.id)}>
                          <td>{String(j.type)}</td>
                          <td>
                            <span
                              className={`badge ${j.status === "failed" ? "red" : j.status === "completed" ? "green" : "amber"}`}
                            >
                              {String(j.status)}
                            </span>
                          </td>
                          <td>{Number(j.attempts)}</td>
                          <td>{String(j.lastError ?? "—")}</td>
                          <td>
                            {j.status === "failed" &&
                              b.viewer.role === "ADMIN" && (
                                <button
                                  className="button secondary"
                                  onClick={async () => {
                                    try {
                                      await mutate("monitoring", {
                                        jobId: j.id,
                                      });
                                      change();
                                    } catch (e) {
                                      setToast((e as Error).message);
                                    }
                                  }}
                                >
                                  Retry
                                </button>
                              )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </details>
      </>
    );
  else if (section === "communications")
    content = (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">EVERY CONVERSATION COUNTS</div>
            <h1>Stay in the conversation.</h1>
            <p>
              Notes, calls, meetings and messages across your visible records.
            </p>
          </div>
          <Link href="/templates" className="button secondary">
            Manage templates
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <p className="info-notice">
          {b.integrationMode === "live"
            ? "Provider delivery updates appear after verified webhooks."
            : "Development integrations · no real messages are delivered."}{" "}
          Open a lead or contact to compose with recorded consent.
        </p>
        <section className="panel communication-feed">
          {communications.map((a) => (
            <button
              className="communication-entry"
              key={String(a.id)}
              onClick={async () => {
                try {
                  openRecord(
                    (await api<{ record: CrmRecord }>(`records/${a.recordId}`))
                      .record,
                  );
                } catch (e) {
                  setToast((e as Error).message);
                }
              }}
            >
              <span className="avatar mint">
                {initials(String((a.record as Data)?.title ?? "Record"))}
              </span>
              <span className="grow">
                <strong>
                  {String((a.record as Data)?.title)}
                  <span className="badge subtle">{String(a.type)}</span>
                </strong>
                <p>{String(a.body)}</p>
                <small>
                  {new Date(String(a.createdAt)).toLocaleString("en-US", {
                    timeZone: s.timezone,
                  })}
                </small>
              </span>
              <ArrowUpRight size={15} />
            </button>
          ))}
          {!communications.length && (
            <Empty
              title="Room for a conversation"
              detail="Log a call, add a note, or compose a message from a lead or contact."
            />
          )}
        </section>
      </>
    );
  else if (kind && meta)
    content = (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">{meta.eyebrow}</div>
            <h1>{meta.title}</h1>
            <p>{meta.tagline}</p>
          </div>
          <div className="heading-actions">
            {kind === "lead" && (
              <button
                className="button secondary"
                onClick={() => setImporting(true)}
              >
                <Upload size={15} />
                Import leads
              </button>
            )}
            {b.viewer.role !== "REP" && section !== "calendar" && (
              <a
                className="button secondary"
                href={`/api/records/export?kind=${kind}&${filters}`}
              >
                <Download size={15} />
                Export
              </a>
            )}
            <button className="button primary" onClick={add}>
              <Plus size={16} />
              New {kindLabel[kind]}
            </button>
          </div>
        </div>
        {section === "contacts" && (
          <RelationshipExplorer count={b.counts.contact ?? 0} />
        )}
        {section === "calendar" ? (
          <section className="panel calendar-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  {new Date(
                    new Date().getFullYear(),
                    new Date().getMonth() + calendarOffset,
                    1,
                  ).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <p>
                  {s.timezone} · local CRM scheduling · showing up to 200 tasks
                </p>
              </div>
              <div className="heading-actions">
                <button
                  className="icon-button"
                  aria-label="Previous month"
                  onClick={() => setCalendarOffset((n) => n - 1)}
                >
                  <ChevronLeft size={19} />
                </button>
                <button
                  className="button secondary"
                  onClick={() => setCalendarOffset(0)}
                >
                  Today
                </button>
                <button
                  className="icon-button"
                  aria-label="Next month"
                  onClick={() => setCalendarOffset((n) => n + 1)}
                >
                  <ChevronRight size={19} />
                </button>
                <Link
                  href="/api/calendar"
                  download
                  className="button secondary"
                >
                  <Download size={15} />
                  iCalendar
                </Link>
              </div>
            </div>
            <div className="calendar-grid">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div className="calendar-weekday" key={d}>
                  {d}
                </div>
              ))}
              {Array.from(
                {
                  length: new Date(
                    new Date().getFullYear(),
                    new Date().getMonth() + calendarOffset,
                    1,
                  ).getDay(),
                },
                (_, i) => (
                  <div className="calendar-day outside" key={`empty-${i}`} />
                ),
              )}
              {Array.from(
                {
                  length: new Date(
                    new Date().getFullYear(),
                    new Date().getMonth() + calendarOffset + 1,
                    0,
                  ).getDate(),
                },
                (_, i) => {
                  const d = new Date(
                    new Date().getFullYear(),
                    new Date().getMonth() + calendarOffset,
                    i + 1,
                  );
                  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
                  return (
                    <div
                      className={`calendar-day ${calendarOffset === 0 && i + 1 === new Date().getDate() ? "today" : ""}`}
                      key={i}
                    >
                      <strong>{i + 1}</strong>
                      {records
                        .filter(
                          (t) =>
                            new Intl.DateTimeFormat("en-CA", {
                              timeZone: s.timezone,
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                            }).format(new Date(String(t.data.dueAt))) === key,
                        )
                        .map((t) => (
                          <button key={t.id} onClick={() => openRecord(t)}>
                            {t.title}
                          </button>
                        ))}
                    </div>
                  );
                },
              )}
            </div>
            <p className="calendar-disclaimer">
              Google Calendar and Outlook sync are disconnected. Export
              iCalendar to use these events in another calendar.
            </p>
          </section>
        ) : (
          <section className="panel records-panel">
            <div className="record-toolbar">
              <div className="table-tabs">
                <button
                  className={!status && !deleted ? "selected" : ""}
                  onClick={() => {
                    setStatus("");
                    setDue("");
                    setDeleted(false);
                    setPage(1);
                  }}
                >
                  All {section}
                  <span>{total}</span>
                </button>
                {(kind === "lead"
                  ? ["New", "Qualified"]
                  : kind === "task"
                    ? ["Pending", "Completed"]
                    : kind === "deal"
                      ? ["won", "lost"]
                      : []
                ).map((x) => (
                  <button
                    key={x}
                    className={status === x && !deleted ? "selected" : ""}
                    onClick={() => {
                      setStatus(x);
                      setDue("");
                      setDeleted(false);
                      setPage(1);
                    }}
                  >
                    {x[0].toUpperCase() + x.slice(1)}
                  </button>
                ))}
                {kind === "task" &&
                  ["today", "upcoming", "overdue"].map((d) => (
                    <button
                      key={d}
                      className={due === d ? "selected" : ""}
                      onClick={() => {
                        setDue(d);
                        setStatus("");
                        setPage(1);
                      }}
                    >
                      {d[0].toUpperCase() + d.slice(1)}
                    </button>
                  ))}
              </div>
              <div className="table-tool-actions">
                <label className="table-search">
                  <Search size={16} />
                  <span className="sr-only">Search {section}</span>
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={`Search ${section}…`}
                  />
                </label>
                <button
                  className={`button secondary ${showFilters ? "pressed" : ""}`}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal size={15} />
                  Filters
                </button>
                {b.viewer.role !== "REP" && (
                  <button
                    className={`icon-button ${deleted ? "pressed" : ""}`}
                    aria-label={deleted ? "Show active records" : "Show trash"}
                    onClick={() => {
                      setDeleted(!deleted);
                      setPage(1);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                {kind === "deal" && (
                  <div className="view-toggle">
                    <button
                      aria-label="Board view"
                      aria-pressed={view === "board"}
                      onClick={() => setView("board")}
                    >
                      <LayoutGrid size={16} />
                    </button>
                    <button
                      aria-label="Table view"
                      aria-pressed={view === "table"}
                      onClick={() => setView("table")}
                    >
                      <List size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {showFilters && controls}
            {kind === "lead" && (
              <div className="saved-views">
                <Bookmark size={14} />
                <span>Saved views</span>
                {savedViews.map((v) => (
                  <button
                    key={v.id}
                    className="text-button"
                    onClick={() => {
                      setSearchInput(String(v.data.query ?? ""));
                      setStatus(String(v.data.status ?? ""));
                      setSort(String(v.data.sort ?? "updatedAt"));
                    }}
                  >
                    {v.title}
                  </button>
                ))}
                <button
                  className="text-button"
                  onClick={async () => {
                    const name = window.prompt("Name this saved view");
                    if (!name) return;
                    try {
                      await mutate("records", {
                        kind: "view",
                        title: name,
                        status: "Saved",
                        data: { kind: "lead", query: q, status, sort },
                      });
                      refresh();
                    } catch (e) {
                      setToast((e as Error).message);
                    }
                  }}
                >
                  + Save current view
                </button>
              </div>
            )}
            {selection.length > 0 && (
              <div className="bulk-bar">
                <strong>{selection.length} selected</strong>
                <label>
                  Assign to
                  <select id="bulk-owner">
                    <option value="">Choose a teammate</option>
                    {b.members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="button primary"
                  onClick={async () => {
                    const value = (
                      document.getElementById("bulk-owner") as HTMLSelectElement
                    ).value;
                    if (!value) return;
                    try {
                      const r = await mutate<{ updated: number }>(
                        "records/bulk",
                        { ids: selection, ownerId: value },
                      );
                      setToast(`${r.updated} records assigned.`);
                      change();
                    } catch (e) {
                      setToast((e as Error).message);
                    }
                  }}
                >
                  Assign
                </button>
                <button
                  className="text-button"
                  onClick={() => setSelection([])}
                >
                  Clear
                </button>
              </div>
            )}
            {loading && (
              <div className="loading-bar" role="status">
                Updating records…
              </div>
            )}
            {records.length === 0 && !loading ? (
              <Empty
                title={
                  deleted
                    ? "The trash is empty."
                    : `A little space for your next ${kindLabel[kind]}.`
                }
                detail={
                  deleted
                    ? "Deleted records appear here so a manager can restore them."
                    : q || status || owner || source
                      ? "Try adjusting your filters."
                      : "Add a record to get things moving."
                }
              >
                {!deleted && (
                  <button className="button primary" onClick={add}>
                    <Plus size={16} />
                    New {kindLabel[kind]}
                  </button>
                )}
              </Empty>
            ) : kind === "deal" && view === "board" && !deleted ? (
              <div className="kanban">
                {[
                  ...(pipeline
                    ? pipelineStages(s, pipeline)
                    : allStages(s)
                  ).map((x) => ({ id: x.id, name: x.name })),
                  { id: "won", name: "Won" },
                  { id: "lost", name: "Lost" },
                ].map((stage, i) => (
                  <div className="kanban-column" key={stage.id}>
                    <div className="kanban-heading">
                      <span className={`stage-dot color-${i % 4}`} />
                      <strong>{stage.name}</strong>
                      <span className="badge subtle">
                        {records.filter((r) => r.status === stage.id).length}
                      </span>
                    </div>
                    {records
                      .filter((r) => r.status === stage.id)
                      .map((r) => (
                        <article className="deal-card" key={r.id}>
                          <span className="eyebrow">
                            {String(r.data.company ?? "OPPORTUNITY")}
                          </span>
                          <button
                            className="deal-card-title"
                            onClick={() => openRecord(r)}
                          >
                            {r.title}
                          </button>
                          <strong className="deal-amount">
                            {money(
                              r.data.amount,
                              String(r.data.currency ?? s.currency),
                            )}
                          </strong>
                          <p>
                            {Number(r.data.probability ?? 0)}% probability ·
                            close {displayDate(r.data.closeDate)}
                          </p>
                          <label className="stage-select">
                            Move to
                            <select
                              value={r.status}
                              aria-label={`Move ${r.title} to stage`}
                              onChange={(e) => stageChange(r, e.target.value)}
                            >
                              {[
                                ...pipelineStages(s, r.data.pipeline).map(
                                  (x) => ({
                                    id: x.id,
                                    name: x.name,
                                  }),
                                ),
                                { id: "won", name: "Won" },
                                { id: "lost", name: "Lost" },
                              ].map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="deal-card-foot">
                            <span className="avatar small mint">
                              {initials(
                                b.members.find((m) => m.userId === r.ownerId)
                                  ?.name ?? "Member",
                              )}
                            </span>
                            <small>{displayDate(r.updatedAt)}</small>
                            <button
                              className="icon-button"
                              aria-label={`Open ${r.title}`}
                              onClick={() => openRecord(r)}
                            >
                              <ArrowUpRight size={15} />
                            </button>
                          </div>
                        </article>
                      ))}
                    <button
                      className="kanban-add"
                      onClick={() => setEditor({ kind: "deal" })}
                    >
                      <Plus size={15} />
                      Add deal
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="table-scroll">
                <table className="records-table">
                  <thead>
                    <tr>
                      {b.viewer.role !== "REP" && (
                        <th className="checkbox-cell">
                          <input
                            type="checkbox"
                            aria-label="Select all records on this page"
                            checked={
                              records.length > 0 &&
                              selection.length === records.length
                            }
                            onChange={(e) =>
                              setSelection(
                                e.target.checked
                                  ? records.map((r) => r.id)
                                  : [],
                              )
                            }
                          />
                        </th>
                      )}
                      <th>
                        <button
                          className="sort-button"
                          onClick={() =>
                            setSort(sort === "title" ? "updatedAt" : "title")
                          }
                        >
                          Name {sort === "title" ? "↑" : "↕"}
                        </button>
                      </th>
                      <th>
                        {kind === "task"
                          ? "Deadline"
                          : kind === "deal" ||
                              kind === "quotation" ||
                              kind === "product"
                            ? "Value"
                            : kind === "workflow"
                              ? "Trigger"
                              : kind === "template"
                                ? "Channel"
                                : "Company / detail"}
                      </th>
                      <th>Status</th>
                      {kind === "lead" && (
                        <>
                          <th>Source</th>
                          <th>Score</th>
                        </>
                      )}
                      <th>Owner</th>
                      <th>Updated</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={r.id}>
                        {b.viewer.role !== "REP" && (
                          <td className="checkbox-cell">
                            <input
                              type="checkbox"
                              aria-label={`Select ${r.title}`}
                              checked={selection.includes(r.id)}
                              onChange={(e) =>
                                setSelection(
                                  e.target.checked
                                    ? [...selection, r.id]
                                    : selection.filter((x) => x !== r.id),
                                )
                              }
                            />
                          </td>
                        )}
                        <td>
                          <div className="person-cell">
                            {kind === "task" ? (
                              <button
                                className={`task-check ${r.status === "Completed" ? "checked" : ""}`}
                                aria-label={`${r.status === "Completed" ? "Reopen" : "Complete"} ${r.title}`}
                                onClick={() => markTask(r)}
                              >
                                {r.status === "Completed" && (
                                  <Check size={13} />
                                )}
                              </button>
                            ) : (
                              <span
                                className={`avatar ${["peach", "lavender", "mint", "butter"][i % 4]}`}
                              >
                                {initials(r.title)}
                              </span>
                            )}
                            <button
                              className="record-name"
                              onClick={() => openRecord(r)}
                            >
                              <strong>{r.title}</strong>
                              <small>
                                {String(
                                  r.data.email ??
                                    r.data.type ??
                                    r.data.industry ??
                                    "",
                                )}
                              </small>
                            </button>
                          </div>
                        </td>
                        <td>
                          {kind === "task" ? (
                            <span
                              className={
                                r.status === "Pending" &&
                                new Date(String(r.data.dueAt)) < new Date()
                                  ? "text-amber"
                                  : ""
                              }
                            >
                              {displayDate(r.data.dueAt, s.timezone)}{" "}
                              {r.status === "Pending" &&
                                new Date(String(r.data.dueAt)) < new Date() && (
                                  <small>· overdue</small>
                                )}
                            </span>
                          ) : ["deal", "product"].includes(kind) ? (
                            money(
                              r.data.amount ?? r.data.price,
                              String(r.data.currency ?? s.currency),
                            )
                          ) : kind === "quotation" ? (
                            <span>
                              {String(r.data.currency)} ·{" "}
                              {Array.isArray(r.data.items)
                                ? r.data.items.length
                                : 0}{" "}
                              line items
                            </span>
                          ) : kind === "workflow" ? (
                            String(r.data.trigger)
                          ) : kind === "template" ? (
                            String(r.data.channel)
                          ) : (
                            String(r.data.company ?? r.data.location ?? "—")
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge ${["Qualified", "Active", "Completed", "won", "Accepted", "Approved"].includes(r.status) ? "green" : ["New", "discovery", "Draft"].includes(r.status) ? "blue" : ["lost", "Unqualified", "Rejected"].includes(r.status) ? "red" : "amber"}`}
                          >
                            {statusLabel(r, s)}
                          </span>
                        </td>
                        {kind === "lead" && (
                          <>
                            <td>
                              <span className="source-dot" />
                              {String(r.data.source ?? "—")}
                            </td>
                            <td>
                              <span className="score-number">
                                {r.leadScore?.score ?? "—"}
                                <span
                                  className={`temperature ${r.leadScore?.temperature.toLowerCase()}`}
                                >
                                  {r.leadScore?.temperature}
                                </span>
                              </span>
                            </td>
                          </>
                        )}
                        <td>
                          <span className="owner-cell">
                            <span className="avatar small neutral">
                              {initials(
                                b.members.find((m) => m.userId === r.ownerId)
                                  ?.name ?? "Former member",
                              )}
                            </span>
                            {b.members
                              .find((m) => m.userId === r.ownerId)
                              ?.name.split(" ")[0] ?? "Former member"}
                          </span>
                        </td>
                        <td className="muted">{displayDate(r.updatedAt)}</td>
                        <td>
                          {deleted ? (
                            <button
                              className="button secondary"
                              onClick={async () => {
                                try {
                                  await mutate(`records/${r.id}/restore`, {});
                                  change();
                                } catch (e) {
                                  setToast((e as Error).message);
                                }
                              }}
                            >
                              <RotateCcw size={14} />
                              Restore
                            </button>
                          ) : (
                            <button
                              className="icon-button"
                              aria-label={`Open ${r.title}`}
                              onClick={() => openRecord(r)}
                            >
                              <MoreHorizontal size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="table-footer">
              <span>
                {total
                  ? `${(page - 1) * (section === "deals" ? 200 : 25) + 1}–${Math.min((page - 1) * (section === "deals" ? 200 : 25) + records.length, total)} of ${total} ${section}`
                  : `0 ${section}`}{" "}
                {deleted ? "in trash" : ""}
              </span>
              <div>
                <label className="sort-control">
                  Sort
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="updatedAt">Recently updated</option>
                    <option value="createdAt">Recently created</option>
                    <option value="title">Name A–Z</option>
                  </select>
                </label>
                <button
                  className="icon-button"
                  aria-label="Previous page"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <span className="page-number">{page}</span>
                <button
                  className="icon-button"
                  aria-label="Next page"
                  disabled={page * (section === "deals" ? 200 : 25) >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </section>
        )}
      </>
    );
  else
    content = (
      <div className="loading-screen">
        <RefreshCw size={25} />
        <p>Loading your workspace…</p>
      </div>
    );
  return (
    <AppShell
      bootstrap={b}
      section={section}
      onWorkspace={() => window.location.reload()}
      onRecord={openRecord}
    >
      {error && <ErrorNotice message={error} />}
      <div
        className="live-indicator"
        title="Authenticated, workspace-scoped updates"
      >
        {live ? <Wifi size={12} /> : <WifiOff size={12} />}{" "}
        {live ? "Updates connected" : "Reconnecting updates"}
      </div>
      {content}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            ×
          </button>
        </div>
      )}
      {detail && !editor && (
        <RecordDetail
          key={detail.id}
          record={detail}
          bootstrap={b}
          onClose={() => setDetail(null)}
          onEdit={(r) => setEditor({ kind: r.kind, record: r })}
          onChanged={change}
          onOpen={setDetail}
          onNewTask={(relatedId) => setEditor({ kind: "task", relatedId })}
        />
      )}{" "}
      {editor && (
        <RecordEditor
          {...editor}
          bootstrap={b}
          onClose={() => setEditor(null)}
          onSaved={onSaved}
        />
      )}{" "}
      {importing && (
        <LeadImport onClose={() => setImporting(false)} onDone={change} />
      )}
    </AppShell>
  );
}
