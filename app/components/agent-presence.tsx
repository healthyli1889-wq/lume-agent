type Status = "idle" | "thinking" | "listening";

export function AgentPresence({
  status = "idle",
  label,
}: {
  status?: Status;
  label?: string;
}) {
  const color =
    status === "listening"
      ? "bg-rose-400"
      : status === "thinking"
        ? "bg-amber-300"
        : "bg-violet-400";
  return (
    <div className="inline-flex items-center gap-2">
      <span className="relative inline-flex h-2 w-2">
        <span className={`pulse-dot relative inline-flex h-2 w-2 rounded-full ${color}`} />
      </span>
      {label && (
        <span className="text-xs font-medium uppercase tracking-wider text-white/45">
          {label}
        </span>
      )}
    </div>
  );
}
