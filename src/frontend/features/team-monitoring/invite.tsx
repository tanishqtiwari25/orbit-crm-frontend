"use client";
import { useState } from "react";
import Link from "next/link";
import { mutate } from "@/frontend/shared/api/client";
import { Dialog, ErrorNotice } from "@/frontend/shared/ui/dialog";
export function InviteEmployee({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [url, setUrl] = useState("");
  return (
    <Dialog title="Invite an employee to your 3D workspace" onClose={onClose}>
      <p>
        Each teammate signs in with their own account. Their desk stays on your
        floor even when offline. Joining does not give access to the owner’s
        account.
      </p>
      {error && <ErrorNotice message={error} />}
      {url ? (
        <div className="personal-work">
          <p role="status">
            Invitation ready. Share this link privately with the employee. No
            email was sent. The employee must accept it before their desk
            appears.
          </p>
          <label>
            Private invitation link
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
          <Link className="button secondary" href="/settings">
            Manage workspace members
          </Link>
        </div>
      ) : (
        <form
          className="record-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              const r = await mutate<{ url: string }>("members", {
                email: f.get("email"),
                role: f.get("role"),
                team: f.get("team"),
                sendEmail: false,
              });
              setUrl(r.url);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Employee email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Team
            <input name="team" defaultValue="Sales" maxLength={80} required />
          </label>
          <label>
            Role
            <select name="role" defaultValue="REP">
              <option value="REP">Employee</option>
              <option value="MANAGER">Team manager</option>
            </select>
          </label>
          <button className="button primary" disabled={busy}>
            {busy ? "Creating invitation…" : "Create private invitation link"}
          </button>
        </form>
      )}
    </Dialog>
  );
}
