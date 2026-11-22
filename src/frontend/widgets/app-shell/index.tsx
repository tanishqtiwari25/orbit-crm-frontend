"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Handshake,
  CheckSquare,
  CalendarDays,
  MessagesSquare,
  FileText,
  ChartNoAxesCombined,
  Zap,
  Settings,
  Search,
  Bell,
  ChevronsUpDown,
  ChevronRight,
  Menu,
  Moon,
  Sun,
  LogOut,
  Package,
  Mail,
  Activity as ActivityIcon,
  Eye,
  ArrowUpRight,
} from "lucide-react";
import {
  initials,
  type Bootstrap,
  type CrmRecord,
} from "@/frontend/entities/crm";
import { api, mutate } from "@/frontend/shared/api/client";
import { Dialog, Empty } from "@/frontend/shared/ui/dialog";
import { AccountSettings } from "@/frontend/features/account-settings";
import { EmployeeActivity } from "./employee-activity";
const sections = [
  ["dashboard", "Overview", LayoutDashboard],
  ["my-work", "My workspace", ActivityIcon],
  ["leads", "Leads", Users],
  ["contacts", "Contacts", Users],
  ["companies", "Companies", Building2],
  ["deals", "Deals", Handshake],
  ["tasks", "Tasks", CheckSquare],
  ["calendar", "Calendar", CalendarDays],
  ["communications", "Communications", MessagesSquare],
  ["quotations", "Quotations", FileText],
  ["reports", "Reports", ChartNoAxesCombined],
  ["automations", "Automations", Zap],
] as const;
export function AppShell({
  bootstrap,
  section,
  children,
  onWorkspace,
  onRecord,
}: {
  bootstrap: Bootstrap;
  section: string;
  children: ReactNode;
  onWorkspace: () => void;
  onRecord: (r: CrmRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [dark, setDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.dataset.theme === "dark",
  );
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<CrmRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [notifications, setNotifications] = useState<
    { body: string; createdAt: string }[] | null
  >(null);
  const nav = (id: string, label: string, Icon: typeof Users) => (
    <Link
      key={id}
      href={`/${id}`}
      onClick={() => setOpen(false)}
      className={`nav-item ${section === id ? "active" : ""}`}
      aria-current={section === id ? "page" : undefined}
    >
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      {id === "leads" && Boolean(bootstrap.counts.lead) && (
        <span className="nav-count">{bootstrap.counts.lead}</span>
      )}
      {id === "tasks" && Boolean(bootstrap.counts.task) && (
        <span className="nav-dot" />
      )}
    </Link>
  );
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <Link className="brand" href="/dashboard">
          <span className="brand-symbol" aria-hidden="true" />
          <span>
            orbit<span className="brand-period">.</span>
          </span>
          <span className="brand-crm">CRM</span>
        </Link>
        <label className="workspace-switch">
          <span className="workspace-avatar">
            {initials(bootstrap.organization.name)}
          </span>
          <span>
            <small>WORKSPACE</small>
            <select
              aria-label="Switch workspace"
              value={bootstrap.organization.id}
              onChange={async (e) => {
                await mutate("workspace", { orgId: e.target.value });
                onWorkspace();
              }}
            >
              {bootstrap.workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </span>
          <ChevronsUpDown size={14} />
        </label>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {sections.slice(0, 2).map(([id, label, I]) => nav(id, label, I))}
          {bootstrap.viewer.role !== "REP" &&
            nav("monitoring", "Live team", Eye)}
          {sections.slice(2, 6).map(([id, label, I]) => nav(id, label, I))}
          <div className="nav-caption">SALES OPERATIONS</div>
          {sections.slice(6).map(([id, label, I]) => nav(id, label, I))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setAccountOpen(true)}>
            <Settings size={18} />
            <span>Account & connections</span>
          </button>
          {nav("products", "Product catalog", Package)}
          {nav("templates", "Message templates", Mail)}
          {bootstrap.viewer.role === "ADMIN" &&
            nav("settings", "Settings", Settings)}
          <div className="workspace-note">
            <span className="live-dot" />
            Private workspace
            <span className="badge subtle">
              {bootstrap.viewer.role.toLowerCase()}
            </span>
          </div>
          <div className="profile">
            <span className="avatar peach">
              {initials(bootstrap.viewer.name)}
            </span>
            <div>
              <strong>{bootstrap.viewer.name}</strong>
              <small>{bootstrap.viewer.email}</small>
            </div>
            <button
              className="icon-button"
              aria-label="Sign out"
              onClick={async () => {
                await mutate("auth/logout", {});
                window.location.assign("/login");
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-content">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {section === "my-work"
                ? "My workspace"
                : section === "monitoring"
                  ? "Live team"
                  : section === "dashboard"
                    ? "Overview"
                    : section[0].toUpperCase() + section.slice(1)}
            </strong>
          </div>
          <div className="top-actions">
            <EmployeeActivity
              key={bootstrap.viewer.orgId}
              orgId={bootstrap.viewer.orgId}
              timezone={bootstrap.organization.settings.timezone}
            />
            <button
              aria-label="Search workspace"
              className="search-trigger"
              onClick={() => setSearch(true)}
            >
              <Search size={16} />
              <span>Search anything…</span>
              <kbd>⌕</kbd>
            </button>
            <button
              className="icon-button"
              aria-label={dark ? "Use light theme" : "Use dark theme"}
              onClick={() => {
                const next = !dark;
                setDark(next);
                document.documentElement.dataset.theme = next
                  ? "dark"
                  : "light";
              }}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={async () => {
                const r = await api<{
                  notifications: { body: string; createdAt: string }[];
                }>("notifications");
                setNotifications(r.notifications);
              }}
            >
              <Bell size={18} />
            </button>
            <span className="avatar peach top-avatar">
              {initials(bootstrap.viewer.name)}
            </span>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {children}
        </main>
        <footer className="app-footer">
          <span>Built for better relationships.</span>
          <span>
            Orbit CRM <span>·</span> {bootstrap.organization.settings.timezone}
          </span>
        </footer>
      </div>
      {accountOpen && <AccountSettings onClose={() => setAccountOpen(false)} />}
      {search && (
        <Dialog title="Search your workspace" onClose={() => setSearch(false)}>
          <form
            className="search-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setSearching(true);
              setSearchError("");
              try {
                setFound(
                  (
                    await api<{ records: CrmRecord[] }>(
                      `search?q=${encodeURIComponent(q)}`,
                    )
                  ).records,
                );
              } catch (e) {
                setSearchError((e as Error).message);
              } finally {
                setSearching(false);
              }
            }}
          >
            <label>
              Search leads, companies, deals and more
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                minLength={2}
                required
                placeholder="Name, email, or company"
              />
            </label>
            <button className="button primary" disabled={searching}>
              {searching ? "Searching…" : "Search"}
            </button>
          </form>
          {searchError && <p role="alert">{searchError}</p>}
          {found.map((r) => (
            <button
              key={r.id}
              className="search-result"
              onClick={() => {
                setSearch(false);
                onRecord(r);
              }}
            >
              <span className="avatar mint">{initials(r.title)}</span>
              <span>
                <strong>{r.title}</strong>
                <small>
                  {r.kind} · {r.status}
                </small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          ))}
          {!found.length && (
            <p className="hint">
              Results include only records you have permission to view.
            </p>
          )}
        </Dialog>
      )}
      {notifications && (
        <Dialog
          title="Notification center"
          onClose={() => setNotifications(null)}
        >
          {notifications.length ? (
            notifications.map((n, i) => (
              <div className="timeline-entry" key={i}>
                <Bell size={16} />
                <div>
                  <p>{n.body}</p>
                  <small>{new Date(n.createdAt).toLocaleString()}</small>
                </div>
              </div>
            ))
          ) : (
            <Empty
              title="You’re all caught up"
              detail="Task reminders and workflow notifications will appear here."
            />
          )}
        </Dialog>
      )}
    </div>
  );
}
