import type { TeamTask } from "@/shared/lib/workforce";

export function taskDeadline(task: TeamTask, now: number) {
  const due = Date.parse(task.dueAt);
  const start = task.assignedAt ? Date.parse(task.assignedAt) : NaN;
  if (!Number.isFinite(due) || !now) return null;
  const delta = due - now;
  const seconds = Math.ceil(Math.abs(delta) / 1000);
  const days = Math.floor(seconds / 86400);
  const clock = [
    Math.floor(seconds / 3600) % 24,
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  return {
    overdue: delta <= 0,
    label: `${days ? `${days}d ` : ""}${clock} ${delta <= 0 ? "overdue" : "left"}`,
    percent:
      Number.isFinite(start) && due > start
        ? Math.round(
            Math.min(1, Math.max(0, (now - start) / (due - start))) * 100,
          )
        : null,
  };
}
