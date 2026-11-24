"use client";
import { useState } from "react";
import { mutate } from "@/frontend/shared/api/client";
import { Dialog, ErrorNotice } from "@/frontend/shared/ui/dialog";
import type { TeamSnapshot, TeamEmployee } from "@/frontend/entities/workforce";
export function AssignEmployee({
  employees,
  initialId,
  onClose,
  onDone,
}: {
  employees: TeamEmployee[];
  initialId?: string;
  onClose: () => void;
  onDone: (snapshot: TeamSnapshot, id: string) => void;
}) {
  const [employeeId, setEmployeeId] = useState(initialId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog title="Add employee & assign work" onClose={onClose}>
      <p>
        Assign work with a deadline. The employee appears at the shared table
        immediately. No invitation or employee login is required.
      </p>
      {error && <ErrorNotice message={error} />}
      <form
        className="record-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const f = new FormData(e.currentTarget);
          try {
            const due = new Date(String(f.get("dueAt")));
            if (!Number.isFinite(+due) || +due <= Date.now())
              throw Error("Choose a future deadline.");
            const result = await mutate<TeamSnapshot>("workforce/assign", {
              ...(employeeId
                ? { employeeId }
                : { name: String(f.get("name")).trim() }),
              team: String(f.get("team") ?? "Team"),
              title: String(f.get("title")).trim(),
              dueAt: due.toISOString(),
            });
            onDone(result, employeeId || result.employees.at(-1)!.userId);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Employee
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">+ Add a new employee</option>
            {employees.map((e) => (
              <option key={e.userId} value={e.userId}>
                {e.name} · {e.team}
              </option>
            ))}
          </select>
        </label>
        {!employeeId && (
          <>
            <label>
              Employee name
              <input name="name" required maxLength={100} autoComplete="off" />
            </label>
            <label>
              Team
              <input name="team" required defaultValue="Team" maxLength={80} />
            </label>
          </>
        )}
        <label>
          Task / work
          <input name="title" required maxLength={200} />
        </label>
        <label>
          Deadline
          <input name="dueAt" type="datetime-local" required />
        </label>
        <small>
          Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. The
          countdown uses the saved deadline.
        </small>
        <button className="button primary" disabled={busy}>
          {busy ? "Assigning…" : "Assign work & add to table"}
        </button>
      </form>
    </Dialog>
  );
}
