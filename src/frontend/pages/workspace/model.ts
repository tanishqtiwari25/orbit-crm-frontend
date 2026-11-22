export interface Report {
  leads: number;
  qualified: number;
  converted: number;
  conversionRate: number;
  pending: number;
  overdue: number;
  won: number;
  lost: number;
  winRate: number;
  salesCycleDays: number;
  stalled: number;
  unassigned: number;
  delayedResponses: number;
  firstResponseHours: number | null;
  respondedLeads: number;
  ownerPerformance: {
    name: string;
    leads: number;
    qualified: number;
    converted: number;
    won: number;
    lost: number;
  }[];
  teamPerformance: {
    name: string;
    leads: number;
    qualified: number;
    converted: number;
    won: number;
    lost: number;
  }[];
  revenue: Record<string, { pipeline: number; expected: number; won: number }>;
  temperatures: { name: string; count: number }[];
  stages: { id: string; name: string; probability: number; count: number }[];
  sources: { name: string; count: number }[];
  owners: { name: string; count: number }[];
  lostReasons: { name: string; count: number }[];
  months: { key: string; name: string; leads: number; converted: number }[];
  definitions: Record<string, string>;
}
