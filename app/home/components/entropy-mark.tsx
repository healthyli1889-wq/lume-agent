"use client";
import { Entropy } from "@/components/ui/entropy";

// Tiny Entropy used as the brand mark in the top bar — the icon IS the
// live agent state (order ↔ chaos, always animating).
export function EntropyMark() {
  return <Entropy size={36} />;
}
