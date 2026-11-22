"use client";
import { taskDeadline, type TeamTask } from "@/frontend/entities/workforce";

export function Deadline({
  task,
  now,
  timezone,
}: {
  task: TeamTask;
  now: number;
  timezone: string;
}) {
  const timing = taskDeadline(task, now);
  const date = (value: string) =>
    new Date(value).toLocaleString("en-GB", {
      timeZone: timezone,
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  return (
    <span className={`task-period ${timing?.overdue ? "is-overdue" : ""}`}>
      <strong className="task-countdown">
        {timing?.label ?? "Loading deadline…"}
      </strong>
      {timing?.percent !== null && timing?.percent !== undefined && (
        <>
          <progress
            max={100}
            value={timing.percent}
            aria-label={`${task.title}: assignment time elapsed`}
          />
          <small>{timing.percent}% of assignment period elapsed</small>
        </>
      )}
      <small>
        {task.assignedAt ? `Assigned ${date(task.assignedAt)} → ` : ""}Due{" "}
        {date(task.dueAt)}
      </small>
      {!task.assignedAt && (
        <small>Assignment start was not recorded for this older task.</small>
      )}
    </span>
  );
}
