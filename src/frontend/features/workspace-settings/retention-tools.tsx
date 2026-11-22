"use client";
import { useState } from "react";
import { api, mutate } from "@/frontend/shared/api/client";
import { ErrorNotice } from "@/frontend/shared/ui/dialog";
type Preview = {
  records: { id: string; title: string; version: number }[];
  blocked: string[];
  expires: number;
  signature: string;
  detail: string;
};
export function RetentionTools() {
  const [preview, setPreview] = useState<Preview>(),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <h3>Review permanent deletion</h3>
      <p>
        Only soft-deleted records older than the workspace retention period
        qualify. Live references block deletion. Back up your data first;
        permanent deletion cannot be undone.
      </p>
      {error && <ErrorNotice message={error} />}{" "}
      {notice && <p role="status">{notice}</p>}
      <button
        className="button secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            setPreview(await api<Preview>("retention"));
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Preview eligible records
      </button>
      {preview && (
        <>
          <p>
            {preview.detail} · {preview.blocked.length} blocked references.
          </p>
          <ul>
            {preview.records.map((r) => (
              <li key={r.id}>
                {r.title} · {r.id}
              </li>
            ))}
          </ul>
          {preview.records.length > 0 && (
            <form
              className="record-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const confirmation = new FormData(e.currentTarget).get(
                  "confirmation",
                );
                setBusy(true);
                setError("");
                try {
                  const r = await mutate<{ detail: string }>(
                    "retention",
                    { ...preview, confirmation },
                    "DELETE",
                  );
                  setNotice(r.detail);
                  setPreview(undefined);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Type PERMANENTLY DELETE to confirm this exact batch
                <input
                  name="confirmation"
                  required
                  pattern="PERMANENTLY DELETE"
                  autoComplete="off"
                />
              </label>
              <button className="button danger-button" disabled={busy}>
                Permanently delete reviewed batch
              </button>
            </form>
          )}
        </>
      )}
    </>
  );
}
