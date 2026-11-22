"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, CheckCircle2, Timer } from "lucide-react";
import { api, mutate } from "@/frontend/shared/api/client";
import { ErrorNotice } from "@/frontend/shared/ui/dialog";
import { Deadline } from "./deadline";
import { FloorMap } from "./floor-map";
import {
  elapsed,
  type PersonalWork,
  type TeamEmployee,
} from "@/frontend/entities/workforce";
const Scene = dynamic(() => import("./office"), {
  ssr: false,
  loading: () => (
    <div className="team-scene-loading">Preparing your workspace…</div>
  ),
});
export function PersonalWorkspace({
  userId,
  name,
  team,
  role,
  timezone,
  onTask,
}: {
  userId: string;
  name: string;
  team: string;
  role: string;
  timezone: string;
  onTask: (id: string) => void;
}) {
  const [work, setWork] = useState<PersonalWork>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(0),
    [active, setActive] = useState(true),
    [motion, setMotion] = useState(false),
    [scene, setScene] = useState(true);
  const lastInput = useRef(0);
  const load = useCallback(async () => {
    try {
      setWork(await api<PersonalWork>("work-focus"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      api<PersonalWork>("work-focus")
        .then((r) => {
          if (alive) setWork(r);
        })
        .catch((e) => {
          if (alive) setError(e.message);
        });
    };
    refresh();
    const polling = setInterval(refresh, 5000);
    const changed = () => refresh();
    window.addEventListener("orbit-work-changed", changed);
    return () => {
      alive = false;
      clearInterval(polling);
      window.removeEventListener("orbit-work-changed", changed);
    };
  }, []);
  useEffect(() => {
    lastInput.current = Date.now();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => setMotion(!reduced.matches);
    preference();
    const input = () => {
      lastInput.current = Date.now();
    };
    const tick = () => {
      setNow(Date.now());
      setActive(
        document.visibilityState === "visible" &&
          Date.now() - lastInput.current < 120000,
      );
    };
    const events = ["pointerdown", "pointermove", "keydown", "scroll"];
    events.forEach((event) =>
      window.addEventListener(event, input, { passive: true }),
    );
    document.addEventListener("visibilitychange", tick);
    reduced.addEventListener("change", preference);
    tick();
    const timer = setInterval(tick, 1000);
    return () => {
      clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, input));
      document.removeEventListener("visibilitychange", tick);
      reduced.removeEventListener("change", preference);
    };
  }, []);
  const employee = useMemo<TeamEmployee>(
    () => ({
      userId,
      name,
      team,
      role,
      status: !active ? "away" : work?.task ? "focusing" : "available",
      lastSeenAt: null,
      lastActiveAt: null,
      focus:
        work?.task && work.startedAt
          ? {
              taskId: work.task.id,
              title: work.task.title,
              startedAt: work.startedAt,
            }
          : null,
      assigned: work?.tasks.length ?? 0,
      overdue: work?.tasks.filter((t) => Date.parse(t.dueAt) < now).length ?? 0,
      completed: 0,
      tasks: work?.tasks ?? [],
    }),
    [userId, name, team, role, active, work, now],
  );
  async function act(action: "start" | "pause" | "complete", taskId?: string) {
    setBusy(true);
    setError("");
    try {
      setWork(
        await mutate<PersonalWork>("work-focus", {
          action,
          taskId: taskId ?? work?.task?.id,
        }),
      );
      window.dispatchEvent(new Event("orbit-work-changed"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="team-monitoring">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR WORKSPACE</div>
          <h1>Welcome to your desk, {name.split(" ")[0]}.</h1>
          <p>
            Your assigned tasks and deadlines. Start focus when you begin; pause
            when you take a break.
          </p>
        </div>
      </div>
      {error && <ErrorNotice message={error} />}
      <div className="team-live-layout">
        <section className="team-floor-panel">
          <div className="team-floor-heading">
            <div>
              <span className="eyebrow">MY DESK</span>
              <h2>
                {work?.task ? "Focus session running" : "Ready when you are"}
              </h2>
            </div>
            <button
              className="button secondary"
              aria-pressed={!motion}
              onClick={() => setMotion((v) => !v)}
            >
              Motion {motion ? "on" : "off"}
            </button>
          </div>
          <div
            className="team-canvas"
            role="group"
            aria-label="Your personal desk. Lit screen and animated hands reflect your active focus session."
          >
            {scene ? (
              <Scene
                employees={[employee]}
                selected={userId}
                onSelect={() => {}}
                animate={motion && active}
                view={0}
                zoom={1}
                timezone={timezone}
                onLost={() => setScene(false)}
              />
            ) : (
              <FloorMap
                employees={[employee]}
                selected={userId}
                onSelect={() => {}}
                animate={motion && active}
              />
            )}
          </div>
          <p className="team-scene-hint">
            Your owner sees this seat in Team workspace. A started focus session
            plus recent app activity lights up the monitor.
          </p>
        </section>
        <aside className="team-inspector">
          <span className="eyebrow">CURRENT FOCUS</span>
          <h2>{work?.task?.title ?? "No task started"}</h2>
          {work?.startedAt && (
            <strong className="focus-clock">
              {elapsed(work.startedAt, now)}
            </strong>
          )}
          {work?.task && (
            <>
              <Deadline task={work.task} now={now} timezone={timezone} />
              <p>
                Due{" "}
                {new Date(work.task.dueAt).toLocaleString("en-GB", {
                  timeZone: timezone,
                })}
              </p>
              <div className="button-group">
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => act("pause")}
                >
                  <Pause size={16} />
                  Pause
                </button>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => act("complete")}
                >
                  <CheckCircle2 size={16} />
                  Complete task
                </button>
              </div>
            </>
          )}
          <h3>Assigned to you · {work?.tasks.length ?? 0}</h3>
          <div className="team-task-list">
            {work?.tasks.map((task) => (
              <div className="personal-task-card" key={task.id}>
                <button className="team-task" onClick={() => onTask(task.id)}>
                  <Timer size={17} />
                  <span>
                    <strong>{task.title}</strong>
                    <Deadline task={task} now={now} timezone={timezone} />
                    <small>
                      Due{" "}
                      {new Date(task.dueAt).toLocaleString("en-GB", {
                        timeZone: timezone,
                      })}
                    </small>
                  </span>
                </button>
                <button
                  className="button secondary"
                  disabled={busy || work.task?.id === task.id}
                  onClick={() => act("start", task.id)}
                >
                  <Play size={14} />
                  {work.task?.id === task.id
                    ? "Focusing"
                    : work.task
                      ? "Switch to task"
                      : "Start focus"}
                </button>
              </div>
            ))}
          </div>
          {work && !work.tasks.length && (
            <p>
              No pending tasks assigned. Ask your manager to assign work to your
              employee account.
            </p>
          )}
          <button className="button secondary" disabled={busy} onClick={load}>
            Refresh my tasks
          </button>
        </aside>
      </div>
      <p className="info-notice">
        Only your app presence and focus timer are shared with your team. No
        keyboard content or screen recordings are collected. This is not proof
        of productivity outside the CRM.
      </p>
    </section>
  );
}
