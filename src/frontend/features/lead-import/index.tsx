"use client";
import { useState } from "react";
import { Upload } from "lucide-react";
import { Dialog, ErrorNotice } from "@/frontend/shared/ui/dialog";
import { mutate } from "@/frontend/shared/api/client";
interface Result {
  row: number;
  status: string;
  message?: string;
  title?: string;
}
export function LeadImport({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [csv, setCsv] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewed, setPreviewed] = useState(false);
  const [committed, setCommitted] = useState(false);
  const run = async (commit: boolean) => {
    setBusy(true);
    setError("");
    try {
      const r = await mutate<{ results: Result[] }>("records/import", {
        csv,
        mapping,
        commit,
      });
      setResults(r.results);
      setPreviewed(true);
      if (commit) {
        setCommitted(true);
        onDone();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog title="Import leads from CSV" onClose={onClose} wide>
      <p className="muted">
        Map your columns, review validation and duplicates, then import valid
        rows. Up to 500 rows per file.
      </p>
      {error && <ErrorNotice message={error} />}
      <label className="upload-zone">
        <Upload size={25} />
        <strong>Choose a CSV file</strong>
        <span>UTF-8 · maximum 750 KB</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 750000) {
              setError("CSV exceeds 750 KB.");
              return;
            }
            const text = await f.text();
            const h =
              text
                .split(/\r?\n/)[0]
                .replace(/^\uFEFF/, "")
                .match(/("(?:[^"]|"")*"|[^,]+)(?=,|$)/g)
                ?.map((s) => s.replace(/^"|"$/g, "").replaceAll('""', '"')) ??
              [];
            setCsv(text);
            setHeaders(h);
            setMapping(
              Object.fromEntries(
                h.map((k) => [
                  k,
                  ["title", "name", "full name"].includes(k.toLowerCase())
                    ? "title"
                    : [
                          "email",
                          "phone",
                          "company",
                          "source",
                          "budget",
                          "location",
                          "priority",
                          "requirement",
                        ].includes(k.toLowerCase())
                      ? k.toLowerCase()
                      : "",
                ]),
              ),
            );
            setPreviewed(false);
            setCommitted(false);
            setResults([]);
          }}
        />
      </label>
      {headers.length > 0 && (
        <div className="form-grid">
          {headers.map((h) => (
            <label key={h}>
              {h}
              <select
                value={mapping[h]}
                onChange={(e) => {
                  setMapping({ ...mapping, [h]: e.target.value });
                  setPreviewed(false);
                }}
              >
                <option value="">Skip column</option>
                {[
                  "title",
                  "email",
                  "phone",
                  "company",
                  "source",
                  "requirement",
                  "budget",
                  "location",
                  "priority",
                ].map((f) => (
                  <option key={f} value={f}>
                    {f === "title" ? "Full name" : f}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      {results.length > 0 && (
        <div className="import-results">
          <p>
            {
              results.filter((r) => ["valid", "created"].includes(r.status))
                .length
            }{" "}
            valid / created ·{" "}
            {results.filter((r) => r.status === "duplicate").length} duplicates
            · {results.filter((r) => r.status === "invalid").length} invalid
          </p>
          {results.map((r) => (
            <div key={r.row}>
              <span
                className={`badge ${r.status === "invalid" ? "red" : r.status === "duplicate" ? "amber" : "green"}`}
              >
                {r.status}
              </span>{" "}
              Row {r.row} · {r.message ?? r.title ?? "Imported"}
            </div>
          ))}
        </div>
      )}
      <div className="dialog-footer">
        <button className="button secondary" onClick={onClose}>
          {committed ? "Done" : "Cancel"}
        </button>
        <button
          className="button secondary"
          disabled={!csv || busy || committed}
          onClick={() => run(false)}
        >
          Preview import
        </button>
        <button
          className="button primary"
          disabled={!previewed || busy || committed}
          onClick={() => run(true)}
        >
          {busy ? "Processing…" : "Import valid rows"}
        </button>
      </div>
    </Dialog>
  );
}
