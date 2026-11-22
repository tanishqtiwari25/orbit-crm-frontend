"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Users,
  Timer,
  Clock3,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  RotateCcw,
  RotateCw,
  Pause,
  Play,
  Search,
  RefreshCw,
  Box,
  List,
  ChevronLeft,
  ChevronRight,
  Radio,
} from "lucide-react";
import { api } from "@/frontend/shared/api/client";
import { ErrorNotice } from "@/frontend/shared/ui/dialog";
import { initials } from "@/frontend/entities/crm";
import { officeView } from "./view";
import { InviteEmployee } from "./invite";
import { Deadline } from "./deadline";
import { EmptyOffice, FloorMap } from "./floor-map";
export { PersonalWorkspace } from "./personal";
import {
  workLabels,
  elapsed,
  taskDeadline,
  type TeamSnapshot,
  type TeamEmployee,
} from "@/frontend/entities/workforce";
const Scene = dynamic(() => import("./office"), {
  ssr: false,
  loading: () => (
    <div className="team-scene-loading">
      <Box size={28} />
      <span>Preparing your live office…</span>
    </div>
  ),
});
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function EmployeeDetail({
  employee,
  timezone,
  onTask,
  onAssign,
  now,
}: {
  employee: TeamEmployee;
  timezone: string;
  onTask: (id: string) => void;
  onAssign: (id: string) => void;
  now: number;
}) {
  const pending = employee.tasks.filter((t) => t.status === "Pending"),
    date = (s: string) =>
      new Date(s).toLocaleString("en-GB", {
        timeZone: timezone,
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
  return (
    <aside className="team-inspector">
      <div className="team-inspector-person">
        <span className="avatar mint">{initials(employee.name)}</span>
        <div>
          <h2>{employee.name}</h2>
          <p>
            {employee.team} · {employee.role.toLowerCase()}
          </p>
        </div>
      </div>
      <span className={`work-status ${employee.status}`}>
        <i />
        {workLabels[employee.status]}
      </span>
      {employee.focus ? (
        <div className="team-focus-card">
          <span className="eyebrow">SELF-REPORTED FOCUS</span>
          <button onClick={() => onTask(employee.focus!.taskId)}>
            {employee.focus.title}
            <ArrowUpRight size={15} />
          </button>
          <strong>{elapsed(employee.focus.startedAt, now)}</strong>
          {employee.status !== "focusing" && (
            <small>
              Timer running; recent active app presence is not confirmed.
            </small>
          )}
        </div>
      ) : (
        <div className="team-focus-card quiet">
          <Timer size={20} />
          <p>No active focus task</p>
          <small>
            {employee.status === "available"
              ? "Online in the app, without a started focus timer."
              : "No work activity is inferred from this status."}
          </small>
        </div>
      )}
      <div className="team-person-stats">
        <span>
          <strong>{employee.assigned}</strong>assigned
        </span>
        <span>
          <strong>{employee.overdue}</strong>overdue
        </span>
        <span>
          <strong>{employee.completed}</strong>completed
        </span>
      </div>
      <div className="section-header">
        <h3>Assigned work</h3>
        <span>{pending.length} open</span>
      </div>
      <div className="team-task-list">
        {pending.map((task) => {
          const late = Date.parse(task.dueAt) < now;
          return (
            <button
              className="team-task"
              key={task.id}
              onClick={() => onTask(task.id)}
            >
              <span className={`task-due-mark ${late ? "late" : ""}`}>
                <Clock3 size={15} />
              </span>
              <span>
                <strong>{task.title}</strong>
                <Deadline task={task} now={now} timezone={timezone} />
                <small className={late ? "deadline-late" : ""}>
                  {late ? "Overdue · " : "Due · "}
                  {date(task.dueAt)}
                </small>
                <small>
                  {task.priority} priority ·{" "}
                  {employee.focus?.taskId === task.id
                    ? "Focus timer running"
                    : "Pending"}
                </small>
              </span>
              <ArrowUpRight size={14} />
            </button>
          );
        })}
        {!pending.length && (
          <p className="team-no-tasks">No pending work assigned.</p>
        )}
      </div>
      <button
        className="button primary team-assign"
        onClick={() => onAssign(employee.userId)}
      >
        <Plus size={16} />
        Assign a task
      </button>
      <p className="team-last-seen">
        {employee.lastActiveAt
          ? `Last app activity ${date(employee.lastActiveAt)}`
          : "No app activity received yet"}
        <br />
        Deadlines in {timezone}
      </p>
    </aside>
  );
}
export function TeamMonitoring({
  onTask,
  onAssign,
  viewerId,
  ownerView,
}: {
  onTask: (id: string) => void;
  onAssign: (id: string) => void;
  viewerId: string;
  ownerView: boolean;
}) {
  const [source, setSnapshot] = useState<TeamSnapshot>(),
    [error, setError] = useState(""),
    [connected, setConnected] = useState(false),
    [selected, setSelected] = useState(""),
    [query, setQuery] = useState(""),
    [team, setTeam] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(0),
    [mode, setMode] = useState<"3d" | "list">("3d"),
    [animate, setAnimate] = useState(true),
    [reduced, setReduced] = useState(false),
    [visible, setVisible] = useState(true),
    [view, setView] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [sceneLost, setSceneLost] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  const [includeMyDesk, setIncludeMyDesk] = useState(!ownerView);
  const [inviteOpen, setInviteOpen] = useState(false);
  const snapshot = useMemo(
    () => (source ? officeView(source, viewerId, includeMyDesk) : undefined),
    [source, viewerId, includeMyDesk],
  );
  const load = useCallback(async () => {
    try {
      setSnapshot(await api<TeamSnapshot>("workforce"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    let stopped = false;
    load();
    const events = new EventSource("/api/workforce/events");
    events.addEventListener("team", (e) => {
      if (stopped) return;
      setSnapshot(JSON.parse((e as MessageEvent).data));
      setConnected(true);
      setError("");
    });
    events.onerror = () => {
      if (!stopped) setConnected(false);
    };
    const fallback = setInterval(() => {
      if (events.readyState !== EventSource.OPEN) load();
    }, 15000);
    const changed = () => load();
    window.addEventListener("orbit-work-changed", changed);
    return () => {
      stopped = true;
      clearInterval(fallback);
      events.close();
      window.removeEventListener("orbit-work-changed", changed);
    };
  }, [load]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    change();
    if (window.innerWidth < 768) setMode("list");
    const visibility = () => setVisible(document.visibilityState === "visible");
    media.addEventListener("change", change);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media.removeEventListener("change", change);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  const employees = useMemo(
    () =>
      snapshot?.employees.filter(
        (e) =>
          (!query ||
            `${e.name} ${e.team}`
              .toLowerCase()
              .includes(query.toLowerCase())) &&
          (!team || e.team === team) &&
          (!status || e.status === status),
      ) ?? [],
    [snapshot, query, team, status],
  );
  const pageCount = Math.max(1, Math.ceil(employees.length / 12)),
    currentPage = Math.min(page, pageCount - 1),
    shown = employees.slice(currentPage * 12, currentPage * 12 + 12),
    person = employees.find((e) => e.userId === selected) ?? shown[0];
  const select = useCallback((id: string) => setSelected(id), []);
  return (
    <section className="team-monitoring minimal-floor">
      <div className="page-heading">
        <div>
          <div className="eyebrow">TEAM OPERATIONS</div>
          <h1>Team workspace</h1>
          <p>
            Your employees at their desks. See their tasks, deadlines and live
            focus.
          </p>
        </div>
        <div className="team-live-meta">
          <span
            className={`team-connection ${connected ? "connected" : ""}`}
            role="status"
          >
            <Radio size={14} />
            {connected ? "Live · 5s updates" : "Reconnecting live updates"}
          </span>
          <small>{snapshot?.scope ?? "Loading team…"}</small>
        </div>
      </div>
      <div className="team-owner-controls">
        <label className="check-label">
          <input
            type="checkbox"
            checked={includeMyDesk}
            onChange={(e) => {
              setIncludeMyDesk(e.target.checked);
              setPage(0);
            }}
          />
          Include my desk
        </label>
        <Link className="button secondary" href="/my-work">
          My workspace
        </Link>
        {ownerView && (
          <button
            className="button primary"
            onClick={() => setInviteOpen(true)}
          >
            <Plus size={16} />
            Invite employee
          </button>
        )}
      </div>
      {inviteOpen && <InviteEmployee onClose={() => setInviteOpen(false)} />}
      {error && <ErrorNotice message={error} />}
      {!snapshot ? (
        <div className="panel team-loading">
          Loading your live team and assignments…
        </div>
      ) : (
        <>
          <div className="team-summary">
            <div>
              <span>
                <Users size={17} />
                Team members
              </span>
              <strong>{snapshot.counts.people}</strong>
              <small>in this view</small>
            </div>
            <div>
              <span>
                <Timer size={17} />
                Focusing
              </span>
              <strong>{snapshot.counts.focusing}</strong>
              <small>timer + active app</small>
            </div>
            <div>
              <span>
                <Radio size={17} />
                Online · no focus
              </span>
              <strong>{snapshot.counts.available}</strong>
              <small>no started timer</small>
            </div>
            <div>
              <span>
                <Clock3 size={17} />
                Away / offline
              </span>
              <strong>{snapshot.counts.away + snapshot.counts.offline}</strong>
              <small>
                {snapshot.counts.away} away · {snapshot.counts.offline} offline
              </small>
            </div>
            <div>
              <span>
                <AlertTriangle size={17} />
                Overdue tasks
              </span>
              <strong>{snapshot.counts.overdue}</strong>
              <small>{snapshot.counts.pending} open assignments</small>
            </div>
          </div>
          <span className="sr-only" role="status" aria-atomic="true">
            {snapshot.counts.people} people, {snapshot.counts.focusing}{" "}
            focusing, {snapshot.counts.overdue} overdue tasks.
          </span>
          <div className="team-toolbar">
            <label className="team-search">
              <Search size={16} />
              <span className="sr-only">Search employees</span>
              <input
                placeholder="Find a teammate…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </label>
            <label>
              <span className="sr-only">Team filter</span>
              <select
                value={team}
                onChange={(e) => {
                  setTeam(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">All teams</option>
                {[...new Set(snapshot.employees.map((e) => e.team))].map(
                  (t) => (
                    <option key={t}>{t}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              <span className="sr-only">Work status filter</span>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">All statuses</option>
                {Object.entries(workLabels).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="team-view-switch" aria-label="Team visualization">
              <button
                aria-pressed={mode === "3d"}
                onClick={() => setMode("3d")}
              >
                <Box size={16} />
                3D floor
              </button>
              <button
                aria-pressed={mode === "list"}
                onClick={() => setMode("list")}
              >
                <List size={16} />
                Team list
              </button>
            </div>
            <button
              className="icon-button"
              aria-label="Refresh team"
              onClick={load}
            >
              <RefreshCw size={17} />
            </button>
          </div>
          {snapshot.limited && (
            <p className="info-notice">
              This workspace view is limited to 200 people and 5,000 tasks.
              Counts describe the loaded records; filter or archive older tasks
              before using larger teams.
            </p>
          )}
          {shown.length ? (
            <>
              <div
                className={`team-live-layout ${mode === "list" ? "list-mode" : ""}`}
              >
                <section className="team-floor-panel">
                  <div className="team-floor-heading">
                    <div>
                      <span className="eyebrow">
                        {mode === "3d" ? "THE LIVE OFFICE" : "TEAM ROSTER"}
                      </span>
                      <h2>
                        {mode === "3d"
                          ? "Live floor"
                          : "Everyone, at a glance."}
                      </h2>
                    </div>
                    <span>
                      {mode === "3d"
                        ? `${employees.length} desks · all statuses`
                        : `${currentPage * 12 + 1}–${Math.min((currentPage + 1) * 12, employees.length)} of ${employees.length}`}
                    </span>
                  </div>
                  {mode === "3d" ? (
                    <>
                      <details className="team-camera-menu">
                        <summary>View controls</summary>
                        <div className="team-camera-controls">
                          <button
                            aria-label="Rotate office left"
                            onClick={() => setView((v) => v - 1)}
                          >
                            <RotateCcw size={15} />
                          </button>
                          <button
                            aria-label="Rotate office right"
                            onClick={() => setView((v) => v + 1)}
                          >
                            <RotateCw size={15} />
                          </button>
                          <button
                            aria-label="Reset office camera"
                            onClick={() => {
                              setView((v) => Math.floor(v / 8) * 8 + 8);
                              setZoom(1);
                            }}
                          >
                            Reset view
                          </button>
                          <button
                            aria-label="Zoom out office"
                            disabled={zoom <= 1}
                            onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                          >
                            −
                          </button>
                          <button
                            aria-label="Zoom in office"
                            disabled={zoom >= 4}
                            onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
                          >
                            +
                          </button>
                          <button
                            aria-pressed={!animate}
                            onClick={() => setAnimate(!animate)}
                          >
                            {animate ? <Pause size={14} /> : <Play size={14} />}
                            Motion {animate ? "on" : "off"}
                          </button>
                        </div>
                      </details>
                      <div
                        className="team-canvas"
                        role="group"
                        aria-label={`Interactive 3D office showing all ${employees.length} matching employees, including offline members. Lit monitors and typing indicate an active focus session. Select employees using the accessible roster below.`}
                      >
                        <SceneBoundary
                          fallback={
                            <FloorMap
                              employees={employees}
                              selected={person?.userId ?? ""}
                              onSelect={select}
                              animate={animate && !reduced && visible}
                            />
                          }
                        >
                          {sceneLost ? (
                            <FloorMap
                              employees={employees}
                              selected={person?.userId ?? ""}
                              onSelect={select}
                              animate={animate && !reduced && visible}
                            />
                          ) : (
                            <Scene
                              employees={employees}
                              selected={person?.userId ?? ""}
                              onSelect={select}
                              animate={animate && !reduced && visible}
                              view={view}
                              zoom={zoom}
                              timezone={snapshot.timezone}
                              onLost={() => setSceneLost(true)}
                            />
                          )}
                        </SceneBoundary>
                      </div>
                      <p className="team-scene-hint">
                        Monitor on + typing = focusing · Monitor off = no active
                        focus. Drag to rotate, right-drag to pan · Select a desk
                        for tasks and deadlines.
                      </p>
                    </>
                  ) : null}
                  <div
                    className={`team-roster ${mode === "list" ? "expanded" : ""}`}
                  >
                    {shown.map((e) => {
                      const currentTask =
                        e.tasks.find((t) => t.id === e.focus?.taskId) ??
                        e.tasks.find((t) => t.status === "Pending");
                      const timing = currentTask
                        ? taskDeadline(currentTask, now)
                        : null;
                      return (
                        <button
                          key={e.userId}
                          className={`team-person ${person?.userId === e.userId ? "selected" : ""}`}
                          aria-pressed={person?.userId === e.userId}
                          onClick={() => select(e.userId)}
                        >
                          <span className="avatar small mint">
                            {initials(e.name)}
                          </span>
                          <span>
                            <strong>{e.name}</strong>
                            <small>
                              {e.team} · {e.assigned} assigned
                              {e.overdue ? ` · ${e.overdue} overdue` : ""}
                            </small>
                            <small>
                              {e.focus?.title ??
                                e.tasks.find((t) => t.status === "Pending")
                                  ?.title ??
                                "No open task assigned"}
                            </small>
                            {timing && (
                              <small
                                className={
                                  timing.overdue
                                    ? "deadline-late"
                                    : "task-countdown"
                                }
                              >
                                {timing.label}
                              </small>
                            )}
                          </span>
                          <span className={`work-status ${e.status}`}>
                            <i />
                            {workLabels[e.status]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="team-floor-footer">
                    <div className="team-legend">
                      {Object.entries(workLabels).map(([status, label]) => (
                        <span className={`work-status ${status}`} key={status}>
                          <i />
                          {label}
                        </span>
                      ))}
                    </div>
                    <div className="team-page-controls">
                      <span className="sr-only">
                        Employee list pages; all matching desks remain on the
                        office floor.
                      </span>
                      <button
                        className="icon-button"
                        aria-label="Previous employees"
                        disabled={currentPage === 0}
                        onClick={() => setPage(currentPage - 1)}
                      >
                        <ChevronLeft size={17} />
                      </button>
                      <span>
                        {currentPage + 1}/{pageCount}
                      </span>
                      <button
                        className="icon-button"
                        aria-label="Next employees"
                        disabled={currentPage + 1 >= pageCount}
                        onClick={() => setPage(currentPage + 1)}
                      >
                        <ChevronRight size={17} />
                      </button>
                    </div>
                  </div>
                </section>
                {person && (
                  <EmployeeDetail
                    key={person.userId}
                    employee={person}
                    timezone={snapshot.timezone}
                    onTask={onTask}
                    onAssign={onAssign}
                    now={now}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="panel team-empty">
              {query || team || status ? <Users size={28} /> : <EmptyOffice />}
              <h2>
                {query || team || status
                  ? "No teammates match these filters."
                  : "Your team will sit together here."}
              </h2>
              <p>
                The owner’s desk is hidden by default. Invite teammates, have
                them join, then assign tasks to their employee accounts.
              </p>
              <ol className="team-setup-steps">
                <li>
                  <strong>Invite & join</strong>
                  <span>
                    Each employee gets their own login and workspace seat.
                  </span>
                </li>
                <li>
                  <strong>Assign the work</strong>
                  <span>
                    Choose the employee in the task’s “Assign to employee”
                    field.
                  </span>
                </li>
                <li>
                  <strong>Start working</strong>
                  <span>
                    Employee opens My workspace and starts focus. Their screen
                    lights up and hands animate here.
                  </span>
                </li>
              </ol>
              {ownerView && (
                <button
                  className="button primary"
                  onClick={() => setInviteOpen(true)}
                >
                  Invite your first employee
                </button>
              )}
            </div>
          )}
          <div className="team-method-note">
            <Timer size={18} />
            <p>
              <strong>
                Every joined member keeps a desk, even when offline.
              </strong>{" "}
              Monitors light up and hands animate only while focusing; these are
              status illustrations, not a recording of someone’s keyboard or
              screen. <strong>What “working” means here:</strong> Focusing
              requires a self-started task timer and recent visible-app
              activity. Away follows two minutes without interaction or a hidden
              app. Offline means no live session update for 90 seconds. Work
              outside the app is not inferred, and these signals are not proof
              of productivity.{" "}
              <span>
                Last snapshot: {new Date(snapshot.at).toLocaleTimeString()}.
              </span>
            </p>
          </div>
        </>
      )}
    </section>
  );
}
