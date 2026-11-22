"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  Users,
  Handshake,
  Target,
  Clock3,
  ChevronRight,
  Phone,
  Video,
  CheckSquare,
  Plus,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import {
  initials,
  money,
  displayDate,
  type Bootstrap,
  type CrmRecord,
} from "@/frontend/entities/crm";
import type { Report } from "./model";
export function Dashboard({
  b,
  report,
  leads,
  tasks,
  deals,
  onRecord,
  onAdd,
}: {
  b: Bootstrap;
  report: Report;
  leads: CrmRecord[];
  tasks: CrmRecord[];
  deals: CrmRecord[];
  onRecord: (r: CrmRecord) => void;
  onAdd: () => void;
}) {
  const c = b.organization.settings.currency;
  const revenue = report.revenue[c] ?? { pipeline: 0, expected: 0, won: 0 };
  const hour = Number(
    new Intl.DateTimeFormat("en", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: b.organization.settings.timezone,
    }).format(new Date()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">A LITTLE CLARITY. A LOT OF POSSIBILITY.</div>
          <h1>
            Good {hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"},{" "}
            {b.viewer.name.split(" ")[0]}{" "}
            <span className="greeting-spark" aria-hidden="true">
              ✳
            </span>
          </h1>
          <p>Here’s what’s happening in your orbit today.</p>
        </div>
        <button className="button primary" onClick={onAdd}>
          <Plus size={16} />
          Add new lead
        </button>
      </div>
      <div className="overview-strip">
        <span className="live-dot" />
        <strong>Your workspace at a glance</strong>
        <span>Every number comes from your visible records.</span>
        <span className="strip-date">
          {new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: b.organization.settings.timezone,
          })}
        </span>
      </div>
      <div className="kpi-grid">
        {[
          {
            label: "Total leads",
            value: report.leads,
            icon: Users,
            foot: `${report.qualified} qualified leads`,
            color: "mint",
            href: "/leads",
          },
          {
            label: "Pipeline value",
            value: money(revenue.pipeline, c),
            icon: Handshake,
            foot: `${money(revenue.expected, c)} weighted forecast`,
            color: "peach",
            href: "/deals",
          },
          {
            label: "Conversion rate",
            value: `${report.conversionRate.toFixed(1)}%`,
            icon: Target,
            foot: `${report.converted} leads converted`,
            color: "lavender",
            href: "/reports",
          },
          {
            label: "Pending follow-ups",
            value: report.pending,
            icon: Clock3,
            foot: `${report.overdue} need your attention`,
            color: "butter",
            href: "/tasks",
          },
        ].map((k) => (
          <Link href={k.href} className="kpi-card" key={k.label}>
            <div className="kpi-top">
              <span>{k.label}</span>
              <span className={`kpi-icon ${k.color}`}>
                <k.icon size={18} />
              </span>
            </div>
            <strong className="kpi-value">{k.value}</strong>
            <div className="kpi-bottom">
              <span
                className={
                  k.label === "Pending follow-ups" && report.overdue
                    ? "text-amber"
                    : ""
                }
              >
                {k.foot}
              </span>
              <ArrowUpRight size={15} />
            </div>
          </Link>
        ))}
      </div>
      <div className="dashboard-main">
        <section className="panel momentum-panel">
          <div className="panel-heading">
            <div>
              <h2>Lead momentum</h2>
              <p>Good relationships start with a first hello.</p>
            </div>
            <span className="badge subtle">Last 6 months</span>
          </div>
          <div className="chart-summary">
            <strong>
              {report.leads}
              <small> leads in your workspace</small>
            </strong>
            <span className="chart-legend">
              <i className="legend-dot mint-fill" />
              All leads
              <i className="legend-dot dark-fill" />
              Converted
            </span>
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label={report.months
              .map(
                (m) => `${m.name}: ${m.leads} leads, ${m.converted} converted`,
              )
              .join("; ")}
          >
            <div className="chart-grid">
              <span>{Math.max(5, ...report.months.map((m) => m.leads))}</span>
              <span>
                {Math.round(
                  Math.max(5, ...report.months.map((m) => m.leads)) / 2,
                )}
              </span>
              <span>0</span>
            </div>
            <div className="chart-columns">
              {report.months.map((m) => (
                <div className="chart-column" key={m.key}>
                  <div className="chart-bars">
                    <div
                      title={`${m.leads} leads`}
                      className="bar all"
                      style={{
                        height: `${(m.leads / Math.max(5, ...report.months.map((m) => m.leads))) * 100}%`,
                      }}
                    />
                    {m.converted > 0 && (
                      <div
                        title={`${m.converted} converted`}
                        className="bar converted"
                        style={{
                          height: `${(m.converted / Math.max(5, ...report.months.map((m) => m.leads))) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                  <span>{m.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="panel-foot">
            <TrendingUp size={15} />
            <span>Creation cohorts · current conversion status</span>
            <Link href="/reports">
              Explore reports <ArrowUpRight size={13} />
            </Link>
          </div>
        </section>
        <section className="panel followup-panel">
          <div className="panel-heading">
            <div>
              <h2>Up next</h2>
              <p>Small steps. Stronger connections.</p>
            </div>
            <Link
              className="icon-button"
              href="/tasks"
              aria-label="See all tasks"
            >
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="next-list">
            {tasks
              .filter((t) => t.status === "Pending")
              .sort(
                (a, b) =>
                  new Date(String(a.data.dueAt)).getTime() -
                  new Date(String(b.data.dueAt)).getTime(),
              )
              .slice(0, 4)
              .map((t, i) => (
                <button
                  className="next-task"
                  key={t.id}
                  onClick={() => onRecord(t)}
                >
                  <span
                    className={`task-icon ${["mint", "peach", "lavender", "butter"][i % 4]}`}
                  >
                    {t.data.type === "Call" ? (
                      <Phone size={17} />
                    ) : t.data.type === "Demo" || t.data.type === "Meeting" ? (
                      <Video size={17} />
                    ) : (
                      <CheckSquare size={17} />
                    )}
                  </span>
                  <span className="task-info">
                    <strong>{t.title}</strong>
                    <small>
                      {String(t.data.type)}
                      <span>·</span>
                      {displayDate(
                        t.data.dueAt,
                        b.organization.settings.timezone,
                      )}
                      <span>·</span>
                      {new Date(String(t.data.dueAt)).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: b.organization.settings.timezone,
                        },
                      )}
                    </small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))}
            {!tasks.some((t) => t.status === "Pending") && (
              <div className="small-empty">
                A clear calendar, a fresh start.
                <br />
                <Link href="/tasks">
                  Create your first follow-up <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
          <Link className="view-all-link" href="/tasks">
            View all follow-ups
            <ArrowRight size={15} />
          </Link>
        </section>
      </div>
      <section className="panel pipeline-panel">
        <div className="panel-heading">
          <div>
            <h2>Your pipeline, in motion</h2>
            <p>Every conversation is a step closer.</p>
          </div>
          <Link href="/deals" className="text-link">
            View pipeline <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="pipeline-track">
          {report.stages.map((stage, i) => (
            <Link
              href={`/deals?status=${stage.id}`}
              key={stage.id}
              className={`pipeline-step step-${i % 4}`}
            >
              <span>
                {stage.name}
                <ArrowUpRight size={13} />
              </span>
              <strong>
                {stage.count}
                <small> {stage.count === 1 ? "deal" : "deals"}</small>
              </strong>
              <div className="stage-meter">
                <i
                  style={{
                    width: `${Math.max(3, (stage.count / Math.max(1, ...report.stages.map((s) => s.count))) * 100)}%`,
                  }}
                />
              </div>
              <small>{stage.probability}% stage probability</small>
            </Link>
          ))}
        </div>
      </section>
      <div className="dashboard-bottom">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Fresh connections</h2>
              <p>A few people worth getting to know.</p>
            </div>
            <Link className="text-link" href="/leads">
              All leads <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 4).map((l, i) => (
                  <tr key={l.id}>
                    <td>
                      <button
                        className="person-cell"
                        onClick={() => onRecord(l)}
                      >
                        <span
                          className={`avatar ${["peach", "lavender", "mint", "butter"][i % 4]}`}
                        >
                          {initials(l.title)}
                        </span>
                        <span>
                          <strong>{l.title}</strong>
                          <small>
                            {String(l.data.company ?? "Individual")}
                          </small>
                        </span>
                      </button>
                    </td>
                    <td>{String(l.data.source ?? "—")}</td>
                    <td>
                      <span
                        className={`badge ${l.status === "Qualified" ? "green" : l.status === "New" ? "blue" : "amber"}`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td>
                      <span className="score-number">
                        {l.leadScore?.score ?? "—"}{" "}
                        <span
                          className={`temperature ${l.leadScore?.temperature.toLowerCase()}`}
                        >
                          {l.leadScore?.temperature}
                        </span>
                      </span>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Open ${l.title}`}
                        onClick={() => onRecord(l)}
                      >
                        <ArrowUpRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!leads.length && (
              <div className="small-empty">
                Your next great connection starts with a lead.
              </div>
            )}
          </div>
        </section>
        <section className="growth-note">
          <span className="eyebrow">ROOM TO GROW</span>
          <div className="growth-orbit" aria-hidden="true">
            <span />
            <span />
            <span />
            <i />
          </div>
          <h2>
            Less busywork.
            <br />
            More human connection.
          </h2>
          <p>
            {deals.filter((d) => d.status === "won").length
              ? `${report.won} won ${report.won === 1 ? "deal" : "deals"}. Keep your next opportunity moving with a thoughtful follow-up.`
              : "Turn the next conversation into a lasting relationship. Your follow-ups make the difference."}
          </p>
          <Link href="/automations" className="button light">
            Explore automations
            <ArrowUpRight size={16} />
          </Link>
        </section>
      </div>
    </>
  );
}
