"use client";
import { useEffect, useState } from "react";

export function CmdKHint() {
  const [mac, setMac] = useState(true);
  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);
  const open = () => {
    window.dispatchEvent(new CustomEvent("hermes:open-palette"));
  };
  return (
    <button
      onClick={open}
      className="glass-strong flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/[0.06]"
      aria-label="Open command palette"
    >
      <span className="relative inline-flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400/60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
      </span>
      <span>Ask Hermes</span>
      <kbd className="kbd">{mac ? "⌘" : "Ctrl"}K</kbd>
    </button>
  );
}
