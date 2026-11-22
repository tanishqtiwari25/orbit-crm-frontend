export type WorkStatus = "focusing" | "available" | "away" | "offline";
export interface TeamTask {
  id: string;
  title: string;
  ownerId: string;
  team: string;
  status: string;
  priority: string;
  dueAt: string;
  /** Null for legacy tasks whose assignment time was not recorded. */
  assignedAt?: string | null;
  version: number;
}
export interface TeamEmployee {
  userId: string;
  name: string;
  team: string;
  role: string;
  status: WorkStatus;
  lastSeenAt: string | null;
  lastActiveAt: string | null;
  focus: { taskId: string; title: string; startedAt: string } | null;
  assigned: number;
  overdue: number;
  completed: number;
  tasks: TeamTask[];
}
export interface TeamSnapshot {
  at: string;
  scope: string;
  timezone: string;
  employees: TeamEmployee[];
  counts: {
    people: number;
    focusing: number;
    available: number;
    away: number;
    offline: number;
    pending: number;
    overdue: number;
  };
  limited: boolean;
}
export interface PersonalWork {
  at: string;
  task: TeamTask | null;
  startedAt: string | null;
  tasks: TeamTask[];
}
