"use client";
import { useEffect, useRef, useState } from "react";
import { Timer, Play, Pause, CheckCircle2 } from "lucide-react";
import { api, mutate } from "@/frontend/shared/api/client";
import { Dialog, ErrorNotice } from "@/frontend/shared/ui/dialog";
import { elapsed, type PersonalWork } from "@/frontend/entities/workforce";
export function EmployeeActivity({
  orgId,
  timezone,
}: {
  orgId: string;
  timezone: string;
}) {
  const [work, setWork] = useState<PersonalWork>(),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [taskId, setTaskId] = useState(""),
    [now, setNow] = useState(Date.now()),
    [connected, setConnected] = useState(true);
  const lastInput = useRef(Date.now());
  useEffect(() => {
    let stopped = false,
      pending = false;
    const activity = () => {
      lastInput.current = Date.now();
    };
    const heartbeat = async () => {
      if (pending) return;
      pending = true;
      try {
        const r = await mutate<PersonalWork>("presence", {
          visible: document.visibilityState === "visible",
          idleSeconds: Math.min(
            86400,
            Math.floor((Date.now() - lastInput.current) / 1000),
          ),
        });
        if (!stopped) {
          setWork(r);
          setConnected(true);
        }
      } catch {
        if (!stopped) setConnected(false);
      } finally {
        pending = false;
      }
    };
    const visibility = () => {
      if (document.visibilityState === "visible") activity();
      heartbeat();
    };
    const refresh = () => {
      api<PersonalWork>("work-focus")
        .then((r) => {
          if (!stopped) setWork(r);
        })
        .catch(() => {});
    };
    ["pointerdown", "pointermove", "keydown", "scroll"].forEach((name) =>
      window.addEventListener(name, activity, { passive: true }),
    );
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("orbit-work-changed", refresh);
    heartbeat();
    const timer = setInterval(heartbeat, 15000);
    return () => {
      stopped = true;
      clearInterval(timer);
      ["pointerdown", "pointermove", "keydown", "scroll"].forEach((name) =>
        window.removeEventListener(name, activity),
      );
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("orbit-work-changed", refresh);
    };
  }, [orgId]);
  useEffect(() => {
    if (!open || !work?.startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open, work?.startedAt]);
  async function act(action: "start" | "pause" | "complete") {
    setBusy(true);
    setError("");
    try {
      setWork(
        await mutate<PersonalWork>("work-focus", {
          action,
          taskId: action === "start" ? taskId : work?.task?.id,
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
    <>
      <button
        className={`focus-trigger ${work?.task ? "is-focusing" : ""}`}
        onClick={() => {
          setOpen(true);
          setNow(Date.now());
          api<PersonalWork>("work-focus")
            .then(setWork)
            .catch((e) => setError(e.message));
        }}
        aria-label={
          work?.task
            ? `My work: focusing on ${work.task.title}`
            : "My work and focus timer"
        }
      >
        <Timer size={17} />
        <span>{work?.task ? "Focusing" : "My work"}</span>
        {work?.task && <i />}
      </button>
      {open && (
        <Dialog title="My work · focus timer" onClose={() => setOpen(false)}>
          <div className="personal-work">
            <p>
              Your team sees your task assignments, focus timer and recent app
              presence. Only activity time is sent—never keys, screen content or
              mouse positions. Focus is self-reported, not a productivity score.
            </p>
            {!connected && (
              <p className="info-notice">
                Activity connection lost. Your last server update may be stale.
              </p>
            )}
            {error && <ErrorNotice message={error} />}
            {work?.task ? (
              <div className="personal-focus">
                <span className="eyebrow">CURRENT FOCUS</span>
                <h3>{work.task.title}</h3>
                <strong className="focus-clock">
                  {work.startedAt ? elapsed(work.startedAt, now) : "00:00:00"}
                </strong>
                <p>
                  Deadline:{" "}
                  {new Date(work.task.dueAt).toLocaleString("en-GB", {
                    timeZone: timezone,
                  })}{" "}
                  ({timezone})
                </p>
                <div className="button-group">
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => act("pause")}
                  >
                    <Pause size={16} />
                    Pause focus
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
              </div>
            ) : (
              <p className="info-notice">
                No active focus session. Choose an assigned task to start.
              </p>
            )}
            <label>
              Assigned pending task
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
              >
                <option value="">Choose your task…</option>
                {work?.tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ·{" "}
                    {new Date(t.dueAt).toLocaleDateString("en-GB", {
                      timeZone: timezone,
                    })}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button primary"
              disabled={busy || !taskId}
              onClick={() => act("start")}
            >
              <Play size={16} />
              {work?.task ? "Switch focus" : "Start focus"}
            </button>
            {work && !work.tasks.length && (
              <p>
                You have no pending assigned tasks. New assignments appear here
                automatically.
              </p>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
