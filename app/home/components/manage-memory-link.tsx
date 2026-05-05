"use client";

export function ManageMemoryLink() {
  return (
    <button
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent("hermes:open-palette", {
            detail: { query: "show what Hermes remembers about me" },
          }),
        )
      }
      className="mt-3 text-[11px] font-medium text-violet-300/90 underline-offset-4 hover:underline"
    >
      Manage memory & exports →
    </button>
  );
}
