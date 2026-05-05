import type { Metadata } from "next";
import "./globals.css";
import { ParticleField } from "./components/particle-field";
import { CommandPalette } from "./components/command-palette";
import { VoiceButton } from "./components/voice-button";

export const metadata: Metadata = {
  title: "Hermes — your workspace agent",
  description:
    "Always-on AI teammate. Lives in your workspace, learns how you work, executes safely.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <ParticleField />
        {children}
        <CommandPalette />
        <VoiceButton />
      </body>
    </html>
  );
}
