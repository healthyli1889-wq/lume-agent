// In production this is resolved from the SSO session. For the demo we
// hardcode a single user identity so every server action sees the same
// permissions and workspace.
export type Identity = {
  userId: string;
  workspaceId: string;
  role: "founder" | "operator" | "viewer";
  permissions: Set<"view_pii" | "view_financials" | "send_email">;
};

export function demoIdentity(): Identity {
  return {
    userId: "u_demo",
    workspaceId: "ws_demo",
    role: "founder",
    permissions: new Set(["view_pii", "view_financials", "send_email"]),
  };
}
