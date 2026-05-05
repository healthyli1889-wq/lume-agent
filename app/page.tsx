import { redirect } from "next/navigation";
import { loadWorkspace } from "@/lib/data/store";

export const dynamic = "force-dynamic";

export default async function Index() {
  const ws = await loadWorkspace();
  redirect(ws?.onboardedAt ? "/home" : "/onboarding");
}
