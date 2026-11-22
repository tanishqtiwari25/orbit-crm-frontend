import type { CrmRecord, Kind, Settings } from "@/shared/lib/contracts";
import { allStages, pipelineStages } from "@/shared/lib/contracts";
export type Field = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
};
export const sectionKind: Record<string, Kind> = {
  leads: "lead",
  contacts: "contact",
  companies: "company",
  deals: "deal",
  tasks: "task",
  calendar: "task",
  quotations: "quotation",
  automations: "workflow",
  products: "product",
  templates: "template",
};
export const kindLabel: Record<Kind, string> = {
  lead: "lead",
  contact: "contact",
  company: "company",
  deal: "deal",
  task: "task",
  quotation: "quotation",
  product: "product",
  workflow: "workflow",
  template: "template",
  view: "saved view",
};
export function statuses(kind: Kind, s: Settings) {
  return {
    lead: ["New", "Contacted", "Qualified", "Unqualified"],
    contact: ["Active", "Inactive"],
    company: ["Active", "Inactive"],
    deal: [...allStages(s).map((x) => x.id), "won", "lost"],
    task: ["Pending", "Completed", "Cancelled"],
    quotation: ["Draft"],
    product: ["Active", "Archived"],
    workflow: ["Paused", "Active"],
    template: ["Draft", "Approved"],
    view: ["Saved"],
  }[kind];
}
export function fields(kind: Kind, s: Settings): Field[] {
  return (
    {
      lead: [
        { key: "email", label: "Email", type: "email" },
        { key: "phone", label: "Phone" },
        { key: "company", label: "Company" },
        { key: "source", label: "Lead source", options: s.leadSources },
        { key: "budget", label: "Budget", type: "number" },
        { key: "targetBudget", label: "Target budget", type: "number" },
        { key: "location", label: "Location" },
        {
          key: "priority",
          label: "Priority",
          options: ["Low", "Medium", "High"],
        },
        {
          key: "timeline",
          label: "Purchase timeline",
          options: ["30 days", "90 days", "Later"],
        },
        { key: "engagement", label: "Engagement interactions", type: "number" },
        { key: "requirement", label: "Requirement", type: "textarea" },
        { key: "tags", label: "Tags (comma separated)", type: "tags" },
        {
          key: "consentEmail",
          label: "Explicit consent to email",
          type: "checkbox",
        },
        {
          key: "consentWhatsapp",
          label: "Explicit consent to WhatsApp",
          type: "checkbox",
        },
        {
          key: "optedOut",
          label: "Opted out of communications",
          type: "checkbox",
        },
        {
          key: "scoreOverride",
          label: "Manual score override (0–100)",
          type: "number",
        },
        { key: "scoreOverrideReason", label: "Override reason" },
      ],
      contact: [
        { key: "email", label: "Email", type: "email" },
        { key: "phone", label: "Phone" },
        { key: "company", label: "Company" },
        { key: "companyId", label: "Company record ID" },
        { key: "role", label: "Job title" },
        {
          key: "consentEmail",
          label: "Explicit consent to email",
          type: "checkbox",
        },
        {
          key: "consentWhatsapp",
          label: "Explicit consent to WhatsApp",
          type: "checkbox",
        },
        { key: "optedOut", label: "Opted out", type: "checkbox" },
      ],
      company: [
        { key: "industry", label: "Industry" },
        { key: "website", label: "Website", type: "url" },
        { key: "location", label: "Location" },
        { key: "size", label: "Company size" },
        { key: "email", label: "Email", type: "email" },
        { key: "phone", label: "Phone" },
      ],
      deal: [
        { key: "company", label: "Company" },
        { key: "companyId", label: "Company record ID" },
        { key: "contactId", label: "Contact record ID" },
        { key: "amount", label: "Deal amount", type: "number", required: true },
        { key: "currency", label: "Currency", required: true },
        { key: "closeDate", label: "Expected close", type: "date" },
        { key: "pipeline", label: "Pipeline" },
        {
          key: "lostReason",
          label: "Lost reason (required when lost)",
          options: s.lostReasons,
        },
        { key: "lostNotes", label: "Lost reason notes", type: "textarea" },
      ],
      task: [
        {
          key: "type",
          label: "Activity type",
          options: ["Call", "Meeting", "Demo", "Task"],
          required: true,
        },
        {
          key: "priority",
          label: "Priority",
          options: ["Low", "Medium", "High"],
          required: true,
        },
        {
          key: "dueAt",
          label: "Deadline (your device timezone)",
          type: "datetime-local",
          required: true,
        },
        {
          key: "reminderMinutes",
          label: "Remind minutes before",
          type: "number",
        },
        { key: "recordId", label: "Linked record ID" },
        { key: "notes", label: "Notes", type: "textarea" },
      ],
      quotation: [
        { key: "recordId", label: "Recipient record ID" },
        { key: "currency", label: "Currency", required: true },
        {
          key: "validUntil",
          label: "Valid until",
          type: "date",
          required: true,
        },
        { key: "terms", label: "Terms", type: "textarea" },
      ],
      product: [
        { key: "price", label: "Unit price", type: "number", required: true },
        { key: "currency", label: "Currency", required: true },
        { key: "description", label: "Description", type: "textarea" },
      ],
      workflow: [
        {
          key: "trigger",
          label: "When this happens",
          options: [
            "lead.created",
            "owner.changed",
            "score.crossed",
            "deal.stage.changed",
            "task.overdue",
            "lead.inactive",
          ],
          required: true,
        },
        {
          key: "action",
          label: "Then perform",
          options: [
            "notify",
            "createTask",
            "addTag",
            "roundRobin",
            "sendMessage",
          ],
          required: true,
        },
        {
          key: "value",
          label: "Notification, task title, tag or message template ID",
          required: true,
        },
        {
          key: "businessHours",
          label: "Run during workspace business hours",
          type: "checkbox",
        },
      ],
      template: [
        {
          key: "channel",
          label: "Channel",
          options: ["email", "whatsapp"],
          required: true,
        },
        { key: "subject", label: "Email subject" },
        {
          key: "body",
          label: "Message · supports {{name}} and {{company}}",
          type: "textarea",
          required: true,
        },
        {
          key: "approved",
          label: "Provider has approved this template",
          type: "checkbox",
        },
        { key: "providerTemplate", label: "Official provider template name" },
        { key: "language", label: "Template language code" },
      ],
      view: [],
    } as Record<Kind, Field[]>
  )[kind];
}
export const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
export const money = (n: unknown, currency = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(n ?? 0));
  } catch {
    return `${currency} ${Number(n ?? 0).toLocaleString()}`;
  }
};
export const statusLabel = (r: CrmRecord, s: Settings) =>
  r.kind === "deal"
    ? (pipelineStages(s, r.data.pipeline).find((x) => x.id === r.status)
        ?.name ?? r.status)
    : r.status;
export function displayDate(value: unknown, timezone?: string) {
  if (!value) return "—";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        ...(timezone ? { timeZone: timezone } : {}),
      });
}
