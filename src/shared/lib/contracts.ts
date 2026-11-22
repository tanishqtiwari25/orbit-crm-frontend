export const kinds = [
  "lead",
  "contact",
  "company",
  "deal",
  "task",
  "quotation",
  "product",
  "workflow",
  "template",
  "view",
] as const;
export type Kind = (typeof kinds)[number];
export type Role = "ADMIN" | "MANAGER" | "REP";
export type Data = { [key: string]: unknown };
export interface CrmRecord {
  id: string;
  orgId: string;
  kind: Kind;
  title: string;
  ownerId: string;
  team: string;
  status: string;
  data: Data;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  leadScore?: { score: number; temperature: string };
}
export interface Viewer {
  userId: string;
  orgId: string;
  name: string;
  email: string;
  role: Role;
  team: string;
  sessionId: string;
  requestId: string;
}
export interface Member {
  userId: string;
  name: string;
  email: string;
  role: Role;
  team: string;
}
export interface Stage {
  id: string;
  name: string;
  probability: number;
}
export interface CustomField {
  key: string;
  label: string;
  kind: Kind;
  type: "text" | "number" | "date" | "select" | "multi-select" | "checkbox";
  required: boolean;
  options: string[];
}
export interface Settings {
  currency: string;
  timezone: string;
  visibility: "own" | "team" | "organization";
  workStart: number;
  workEnd: number;
  workDays: number[];
  emailReminders: boolean;
  stages: Stage[];
  pipelines?: { id: string; name: string; stages: Stage[] }[];
  lostReasons: string[];
  leadSources: string[];
  tags: string[];
  scoring: {
    weights: {
      budget: number;
      requirement: number;
      timeline: number;
      completeness: number;
      engagement: number;
    };
    hot: number;
    warm: number;
    decayPerWeek: number;
  };
  customFields: CustomField[];
  brand: string;
  quoteTerms: string;
  retentionDays: number;
  alerts?: {
    enabled: boolean;
    failedJobs: number;
    backlog: number;
    overdueHours: number;
    email: boolean;
  };
}
export const pipelineStages = (s: Settings, pipeline?: unknown) =>
  s.pipelines?.find((p) => p.id === pipeline)?.stages ?? s.stages;
export const allStages = (s: Settings) =>
  Array.from(
    new Map(
      [...s.stages, ...(s.pipelines ?? []).flatMap((p) => p.stages)].map(
        (stage) => [stage.id, stage],
      ),
    ).values(),
  );
export interface Bootstrap {
  viewer: Viewer;
  organization: { id: string; name: string; settings: Settings };
  workspaces: { id: string; name: string }[];
  members: Member[];
  counts: { [key: string]: number };
  integrationMode: string;
}
export interface Activity {
  id: string;
  actorId: string;
  type: string;
  body: string;
  createdAt: string;
}
export const defaultSettings: Settings = {
  currency: "USD",
  timezone: "Asia/Kolkata",
  visibility: "team",
  workStart: 9,
  workEnd: 18,
  workDays: [1, 2, 3, 4, 5],
  emailReminders: false,
  stages: [
    { id: "discovery", name: "Discovery", probability: 15 },
    { id: "qualified", name: "Qualified", probability: 35 },
    { id: "proposal", name: "Proposal", probability: 60 },
    { id: "negotiation", name: "Negotiation", probability: 80 },
  ],
  lostReasons: ["Budget", "Timing", "Competitor", "No decision"],
  leadSources: ["Website", "Referral", "Outbound", "LinkedIn", "Event"],
  tags: ["Enterprise", "Priority", "New market"],
  scoring: {
    weights: {
      budget: 25,
      requirement: 25,
      timeline: 20,
      completeness: 15,
      engagement: 15,
    },
    hot: 75,
    warm: 45,
    decayPerWeek: 2,
  },
  customFields: [],
  brand: "Orbit",
  quoteTerms: "Payment due within 30 days of acceptance.",
  retentionDays: 365,
};
