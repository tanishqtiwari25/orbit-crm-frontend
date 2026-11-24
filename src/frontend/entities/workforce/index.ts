export type {
  TeamSnapshot,
  TeamEmployee,
  TeamTask,
  PersonalWork,
  WorkStatus,
} from "@/shared/lib/workforce";
import type { WorkStatus, TeamEmployee } from "@/shared/lib/workforce";
export { taskDeadline } from "./deadline";
export const workLabels: Record<WorkStatus, string> = {
  focusing: "Focusing",
  available: "Online · no focus",
  away: "Away",
  offline: "Offline",
};
export const workColors: Record<WorkStatus, string> = {
  focusing: "#72d6af",
  available: "#83b4ed",
  away: "#e4b975",
  offline: "#9aabba",
};
export const elapsed = (startedAt: string, now = Date.now()) => {
  const seconds = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};

/** Assignment activity is a schedule, independent of authenticated presence. */
export function assignmentState(employee: TeamEmployee, now = Date.now()) {
  if (!employee.assignmentOnly) return null;
  const pending = employee.tasks.filter((t) => t.status === "Pending");
  if (!pending.length) return "completed";
  return pending.some(
    (t) => Number.isFinite(Date.parse(t.dueAt)) && Date.parse(t.dueAt) > now,
  )
    ? "active"
    : "overdue";
}
export function employeeLabel(employee: TeamEmployee, now = Date.now()) {
  const state = assignmentState(employee, now);
  return state === "active"
    ? "Assigned · active"
    : state === "overdue"
      ? "Overdue"
      : state === "completed"
        ? "Completed"
        : workLabels[employee.status];
}
