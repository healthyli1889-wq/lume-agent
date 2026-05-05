"use client";
import { useState, useTransition } from "react";
import type {
  RenderedWidget,
  BriefItem,
  ActionId,
} from "@/lib/widgets/contract";
import { dispatchAction, recordEdit } from "../actions";

export function BriefClient({ widgets: initial }: { widgets: RenderedWidget[] }) {
  const [widgets, setWidgets] = useState(initial);

  const removeItem = (widgetType: string, itemId: string) => {
    setWidgets((ws) =>
      ws.map((w) =>
        w.type === widgetType
          ? { ...w, items: w.items.filter((i) => i.id !== itemId) }
          : w,
      ),
    );
  };

  return (
    <div className="space-y-5">
      {widgets.map((w) => (
        <Section key={w.type} widget={w} onItemRemoved={removeItem} />
      ))}
    </div>
  );
}

function Section({
  widget,
  onItemRemoved,
}: {
  widget: RenderedWidget;
  onItemRemoved: (widgetType: string, itemId: string) => void;
}) {
  return (
    <section className="glass-card overflow-hidden">
      <header className="flex items-baseline justify-between border-b border-white/[0.06] px-5 py-3.5">
        <div>
          <h2 className="text-sm font-medium text-white/90">{widget.title}</h2>
          <p className="text-[11px] text-white/45">{widget.question}</p>
        </div>
        <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] tabular-nums text-white/55">
          {widget.items.length}
        </span>
      </header>
      {widget.items.length === 0 ? (
        <p className="px-5 py-7 text-sm italic text-white/45">{widget.emptyState}</p>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {widget.items.map((item) => (
            <Item
              key={item.id}
              widgetType={widget.type}
              item={item}
              onRemove={() => onItemRemoved(widget.type, item.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Item({
  widgetType,
  item,
  onRemove,
}: {
  widgetType: string;
  item: BriefItem;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [body, setBody] = useState(item.bodyDraft ?? "");
  const original = item.bodyDraft ?? "";
  const [pending, startTransition] = useTransition();
  const [learned, setLearned] = useState<string | null>(null);

  const primary = item.actions.find((a) => a.primary) ?? item.actions[0];

  const onAction = (actionId: ActionId) => {
    if ((actionId === "draft_reply" || actionId === "open") && item.bodyDraft) {
      setExpanded((v) => !v);
      return;
    }
    startTransition(async () => {
      await dispatchAction({ widgetType, itemId: item.id, actionId });
      onRemove();
    });
  };

  const onSend = () => {
    startTransition(async () => {
      let learnedSummary: string | null = null;
      if (body !== original) {
        const result = await recordEdit({
          itemId: item.id,
          original,
          edited: body,
          artifactKind: "card",
        });
        learnedSummary = result.learnedSummary;
        setLearned(learnedSummary);
      }
      await dispatchAction({ widgetType, itemId: item.id, actionId: "send" });
      setTimeout(onRemove, learnedSummary ? 1800 : 400);
    });
  };

  return (
    <li className="px-5 py-4 transition hover:bg-white/[0.018]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white/90 truncate">{item.title}</p>
          <p className="mt-0.5 text-xs text-white/55 truncate">{item.subtitle}</p>
          <div className="mt-1.5 flex items-center gap-2">
            {item.sensitivity === "confidential" && (
              <span className="rounded-md border border-amber-300/20 bg-amber-300/[0.06] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-200/80">
                confidential
              </span>
            )}
            <ConfidenceDot value={item.confidence} />
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {item.actions
            .filter((a) => a !== primary)
            .map((a) => (
              <button
                key={a.id}
                onClick={() => onAction(a.id)}
                disabled={pending}
                className="rounded-md px-2.5 py-1.5 text-xs text-white/55 transition hover:bg-white/[0.05] hover:text-white/85 disabled:opacity-40"
              >
                {a.label}
              </button>
            ))}
          {primary && (
            <button
              onClick={() => onAction(primary.id)}
              disabled={pending}
              className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-neutral-950 transition hover:bg-white/90 disabled:opacity-40"
            >
              {primary.label}
            </button>
          )}
        </div>
      </div>

      {expanded && item.bodyDraft !== undefined && (
        <div className="mt-3 space-y-2 fade-in">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={Math.max(6, body.split("\n").length + 1)}
            className="w-full rounded-md border border-white/[0.08] bg-black/30 p-3 font-mono text-[13px] leading-relaxed text-white/85 focus:border-violet-400/40 focus:outline-none focus:ring-1 focus:ring-violet-400/40"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] text-white/45">
              {body !== original ? (
                <>
                  Edited{" "}
                  <span className="font-medium text-white/75">
                    {diffSummary(original, body)}
                  </span>{" "}
                  — Hermes will learn from this.
                </>
              ) : (
                <>Pre-drafted from prior context. Edit to teach voice.</>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setBody(original);
                  setExpanded(false);
                }}
                className="text-[11px] text-white/45 underline-offset-4 hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={onSend}
                disabled={pending}
                className="rounded-md bg-emerald-400/90 px-3 py-1.5 text-xs font-medium text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-40"
              >
                {pending
                  ? "Sending…"
                  : body !== original
                    ? "Send & teach Hermes"
                    : "Send"}
              </button>
            </div>
          </div>
          {learned && (
            <div className="rounded-md border border-emerald-400/15 bg-emerald-400/[0.05] px-3 py-2 text-[11px] text-emerald-200/90 fade-in">
              Hermes learned: {learned}
            </div>
          )}
        </div>
      )}

      {!expanded && item.provenance.length > 0 && (
        <p className="mt-2 text-[10px] tabular-nums text-white/30">
          {item.provenance.map((p) => `[${p.sourceId}]`).join(" ")}
        </p>
      )}
    </li>
  );
}

function ConfidenceDot({ value }: { value: number }) {
  const color =
    value >= 0.9 ? "bg-emerald-400/80" : value >= 0.75 ? "bg-violet-400/80" : "bg-amber-300/80";
  return (
    <span className="inline-flex items-center gap-1 text-[10px] tabular-nums text-white/40">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {Math.round(value * 100)}%
    </span>
  );
}

function diffSummary(a: string, b: string): string {
  const aw = a.split(/\s+/).length;
  const bw = b.split(/\s+/).length;
  const delta = bw - aw;
  if (Math.abs(delta) < 5) return "tone & wording";
  return delta > 0 ? `${delta} more words` : `${-delta} fewer words`;
}
