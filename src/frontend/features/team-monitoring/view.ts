import type { TeamSnapshot } from "@/frontend/entities/workforce";
export function officeView(
  source: TeamSnapshot,
  viewerId: string,
  includeMyDesk: boolean,
): TeamSnapshot {
  const employees = source.employees.filter(
    (e) => includeMyDesk || e.userId !== viewerId,
  );
  return {
    ...source,
    employees,
    counts: {
      people: employees.length,
      focusing: employees.filter((e) => e.status === "focusing").length,
      available: employees.filter((e) => e.status === "available").length,
      away: employees.filter((e) => e.status === "away").length,
      offline: employees.filter(
        (e) => !e.assignmentOnly && e.status === "offline",
      ).length,
      pending: employees.reduce((sum, e) => sum + e.assigned, 0),
      overdue: employees.reduce((sum, e) => sum + e.overdue, 0),
    },
  };
}
