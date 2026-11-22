"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  fields,
  pipelineStages,
  statuses,
  kindLabel,
  type Kind,
  type Bootstrap,
  type CrmRecord,
  type Data,
} from "@/frontend/entities/crm";
import { Dialog, ErrorNotice } from "@/frontend/shared/ui/dialog";
import { api, mutate } from "@/frontend/shared/api/client";
type Item = {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
};
export function RecordEditor({
  kind,
  record,
  bootstrap,
  onClose,
  onSaved,
  relatedId,
  initialOwnerId,
}: {
  kind: Kind;
  record?: CrmRecord;
  bootstrap: Bootstrap;
  onClose: () => void;
  onSaved: () => void;
  relatedId?: string;
  initialOwnerId?: string;
}) {
  const s = bootstrap.organization.settings;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Item[]>(
    (record?.data.items as Item[]) ?? [
      { description: "", quantity: 1, unitPrice: 0, discount: 0, tax: 0 },
    ],
  );
  const [stage, setStage] = useState(record?.status ?? statuses(kind, s)[0]);
  const [pipeline, setPipeline] = useState(String(record?.data.pipeline ?? ""));
  const [products, setProducts] = useState<CrmRecord[]>([]);
  const [lines, setLines] = useState<{ productId: string; quantity: number }[]>(
    (record?.data.products as { productId: string; quantity: number }[]) ?? [],
  );
  useEffect(() => {
    if (kind === "deal")
      api<{ records: CrmRecord[] }>("records?kind=product&limit=200")
        .then((r) => setProducts(r.records))
        .catch((e) => setError(e.message));
  }, [kind]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const data: Data = { ...record?.data };
    const custom: Data = { ...((data.custom as Data) ?? {}) };
    for (const f of fields(kind, s)) {
      const value = form.get(f.key);
      if (f.type === "checkbox") data[f.key] = value === "on";
      else if (f.type === "number") {
        if (value !== "") data[f.key] = Number(value);
        else if (f.key === "scoreOverride") data[f.key] = null;
        else delete data[f.key];
      } else if (f.type === "tags")
        data[f.key] = String(value ?? "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
      else if (f.type === "datetime-local" && value)
        data[f.key] = new Date(String(value)).toISOString();
      else data[f.key] = String(value ?? "");
    }
    for (const f of s.customFields.filter((f) => f.kind === kind)) {
      const value = form.get(`custom-${f.key}`);
      custom[f.key] =
        f.type === "checkbox"
          ? value === "on"
          : f.type === "number"
            ? value === ""
              ? null
              : Number(value)
            : f.type === "multi-select"
              ? form.getAll(`custom-${f.key}`)
              : String(value ?? "");
    }
    data.custom = custom;
    if (kind === "deal") {
      data.products = lines;
      data.pipeline = pipeline;
    }
    if (kind === "template")
      data.parameters = String(form.get("parameters") ?? "")
        .split("\n")
        .filter(Boolean);
    if (kind === "quotation") data.items = items;
    if (kind === "workflow") {
      data.enabled = false;
      delete data.testedAt;
      const field = String(form.get("conditionField") ?? "");
      data.condition = field
        ? {
            field,
            operator: String(form.get("conditionOperator")),
            value: String(form.get("conditionValue")),
          }
        : undefined;
    }
    try {
      await mutate(
        record ? `records/${record.id}` : "records",
        {
          kind,
          title: form.get("title"),
          status: kind === "workflow" ? "Paused" : stage,
          ownerId: form.get("ownerId"),
          data,
          ...(record ? { version: record.version } : {}),
        },
        record ? "PATCH" : "POST",
      );
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  const value = (key: string) => {
    const v = record?.data[key];
    if (key === "recordId" && !v && relatedId) return relatedId;
    if (key === "currency" && !v) return s.currency;
    if (key === "dueAt" && v) {
      const d = new Date(String(v));
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    }
    if (key === "tags") return ((v as string[]) ?? []).join(", ");
    if (key === "type" && !v) return "Task";
    if (key === "priority" && !v) return "Medium";
    if (key === "terms" && !v) return s.quoteTerms;
    if (key === "timeline" && !v) return "90 days";
    if (key === "engagement" && !v) return 0;
    return v == null ? "" : String(v);
  };
  return (
    <Dialog
      title={`${record ? "Edit" : "New"} ${kindLabel[kind]}`}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="record-form">
        {error && <ErrorNotice message={error} />}
        <div className="form-grid">
          <label className="full">
            {kind === "lead" || kind === "contact"
              ? "Full name"
              : kind === "task" ? "Task title / what needs to be done"
              : "Name / title"}
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={record?.title}
              placeholder={kind === "task" ? "e.g. Prepare the customer quotation" : undefined}
              autoFocus
            />
          </label>
          <label>
            Status
            <select value={stage} onChange={(e) => setStage(e.target.value)}>
              {[
                ...new Set([
                  ...(kind === "deal"
                    ? [
                        ...pipelineStages(s, pipeline).map((x) => x.id),
                        "won",
                        "lost",
                      ]
                    : statuses(kind, s)),
                  ...(record ? [record.status] : []),
                ]),
              ].map((status) => (
                <option key={status} value={status}>
                  {pipelineStages(s, pipeline).find((x) => x.id === status)
                    ?.name ?? status}
                </option>
              ))}
            </select>
          </label>
          <label>
            {kind === "task" ? "Assign to employee" : "Owner"}
            <select
              name="ownerId"
              defaultValue={
                record?.ownerId ?? initialOwnerId ?? bootstrap.viewer.userId
              }
              disabled={bootstrap.viewer.role === "REP"}
            >
              {bootstrap.members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </select>
            {kind === "task" && <small>Choose a joined workspace member. Typing someone’s name in the task title does not assign the task to them. Add missing employees in Settings → Members first.</small>}
            {bootstrap.viewer.role === "REP" && (
              <input
                type="hidden"
                name="ownerId"
                value={record?.ownerId ?? bootstrap.viewer.userId}
              />
            )}
          </label>
          {kind === "deal" && (
            <label>
              Pipeline
              <input
                name="pipeline"
                list="pipeline-options"
                value={pipeline}
                onChange={(e) => {
                  setPipeline(e.target.value);
                  if (!["won", "lost"].includes(stage))
                    setStage(pipelineStages(s, e.target.value)[0].id);
                }}
              />
              <datalist id="pipeline-options">
                {s.pipelines?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </datalist>
            </label>
          )}
          {fields(kind, s)
            .filter((f) => kind !== "deal" || f.key !== "pipeline")
            .map((f) => (
              <label
                key={f.key}
                className={
                  f.type === "textarea"
                    ? "full"
                    : f.type === "checkbox"
                      ? "check-label"
                      : ""
                }
              >
                {f.type === "checkbox" ? (
                  <>
                    <input
                      name={f.key}
                      type="checkbox"
                      defaultChecked={Boolean(record?.data[f.key])}
                    />
                    {f.label}
                  </>
                ) : (
                  <>
                    {f.label}
                    {f.required && " *"}
                    {f.options ? (
                      <select
                        name={f.key}
                        required={f.required}
                        defaultValue={value(f.key)}
                      >
                        <option value="">Choose…</option>
                        {f.options.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    ) : f.type === "textarea" ? (
                      <textarea
                        name={f.key}
                        defaultValue={value(f.key)}
                        required={f.required}
                        rows={3}
                      />
                    ) : (
                      <input
                        name={f.key}
                        type={f.type === "tags" ? "text" : (f.type ?? "text")}
                        defaultValue={value(f.key)}
                        required={f.required}
                        min={f.type === "number" ? 0 : undefined}
                        step={f.type === "number" ? "any" : undefined}
                        maxLength={5000}
                      />
                    )}
                  </>
                )}
              </label>
            ))}
          {kind === "template" && (
            <label className="full">
              WhatsApp body parameters (one per line, official template order)
              <textarea
                name="parameters"
                rows={3}
                defaultValue={(
                  (record?.data.parameters as string[]) ?? []
                ).join("\n")}
              />
              <small>
                Supports {"{{name}}"} and {"{{company}}"}. Must match the
                approved provider template.
              </small>
            </label>
          )}
          {kind === "deal" && (
            <div className="full">
              <h3>Products / services</h3>
              {lines.map((line, i) => (
                <div className="form-grid" key={i}>
                  <label>
                    Product
                    <select
                      value={line.productId}
                      required
                      onChange={(e) =>
                        setLines(
                          lines.map((l, j) =>
                            j === i ? { ...l, productId: e.target.value } : l,
                          ),
                        )
                      }
                    >
                      <option value="">Choose product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Quantity
                    <input
                      type="number"
                      min={0.001}
                      step="any"
                      required
                      value={line.quantity}
                      onChange={(e) =>
                        setLines(
                          lines.map((l, j) =>
                            j === i
                              ? { ...l, quantity: Number(e.target.value) }
                              : l,
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setLines(lines.filter((_, j) => j !== i))}
                  >
                    Remove line
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  setLines([...lines, { productId: "", quantity: 1 }])
                }
              >
                <Plus size={16} />
                Add product
              </button>
              <p className="hint">
                Product associations do not overwrite the negotiated deal
                amount.
              </p>
            </div>
          )}
          {kind === "workflow" && (
            <>
              <label>
                Optional condition
                <select
                  name="conditionField"
                  defaultValue={
                    ((record?.data.condition as Data)?.field as string) ?? ""
                  }
                >
                  <option value="">Always match</option>
                  {["status", "source", "priority", "score"].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label>
                Operator
                <select
                  name="conditionOperator"
                  defaultValue={
                    ((record?.data.condition as Data)?.operator as string) ??
                    "equals"
                  }
                >
                  <option>equals</option>
                  <option>gte</option>
                </select>
              </label>
              <label>
                Condition value
                <input
                  name="conditionValue"
                  defaultValue={
                    ((record?.data.condition as Data)?.value as string) ?? ""
                  }
                />
              </label>
              <p className="hint full">
                Workflows are saved paused. Preview matching records, then
                enable from the workflow detail.
              </p>
            </>
          )}
          {s.customFields
            .filter((f) => f.kind === kind)
            .map((f) => (
              <label
                key={f.key}
                className={f.type === "checkbox" ? "check-label" : ""}
              >
                {f.label}
                {f.type === "select" || f.type === "multi-select" ? (
                  <select
                    name={`custom-${f.key}`}
                    multiple={f.type === "multi-select"}
                    required={f.required}
                    defaultValue={
                      f.type === "multi-select"
                        ? (((record?.data.custom as Data)?.[
                            f.key
                          ] as string[]) ?? [])
                        : (((record?.data.custom as Data)?.[f.key] as string) ??
                          "")
                    }
                  >
                    {f.type === "select" && <option value="">Choose…</option>}
                    {f.options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={`custom-${f.key}`}
                    type={
                      f.type === "checkbox"
                        ? "checkbox"
                        : f.type === "number"
                          ? "number"
                          : f.type === "date"
                            ? "date"
                            : "text"
                    }
                    required={f.type === "checkbox" ? false : f.required}
                    defaultChecked={Boolean(
                      (record?.data.custom as Data)?.[f.key],
                    )}
                    defaultValue={
                      f.type === "checkbox"
                        ? undefined
                        : String((record?.data.custom as Data)?.[f.key] ?? "")
                    }
                  />
                )}
              </label>
            ))}
        </div>
        {kind === "quotation" && (
          <div className="quote-items">
            <h3>Line items</h3>
            {items.map((item, i) => (
              <div className="line-item" key={i}>
                <label>
                  Description
                  <input
                    required
                    value={item.description}
                    onChange={(e) =>
                      setItems(
                        items.map((x, j) =>
                          j === i ? { ...x, description: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </label>
                {(
                  [
                    ["quantity", "Qty"],
                    ["unitPrice", "Unit price"],
                    ["discount", "Discount %"],
                    ["tax", "Tax %"],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k}>
                    {label}
                    <input
                      type="number"
                      min={k === "quantity" ? 0.01 : 0}
                      max={k === "tax" || k === "discount" ? 100 : undefined}
                      step="any"
                      required
                      value={item[k]}
                      onChange={(e) =>
                        setItems(
                          items.map((x, j) =>
                            j === i ? { ...x, [k]: Number(e.target.value) } : x,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove line ${i + 1}`}
                  disabled={items.length === 1}
                  onClick={() => setItems(items.filter((_, j) => j !== i))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                setItems([
                  ...items,
                  {
                    description: "",
                    quantity: 1,
                    unitPrice: 0,
                    discount: 0,
                    tax: 0,
                  },
                ])
              }
            >
              <Plus size={15} />
              Add line
            </button>
          </div>
        )}
        <div className="dialog-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : `Save ${kindLabel[kind]}`}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
