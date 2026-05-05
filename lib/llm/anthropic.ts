import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

export type LlmCall = {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
};

export async function complete({
  systemPrompt,
  userPrompt,
  maxTokens = 600,
}: LlmCall): Promise<string> {
  if (client) {
    try {
      const resp = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: maxTokens,
        system: [
          { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
        ],
        messages: [{ role: "user", content: userPrompt }],
      });
      const block = resp.content.find((c) => c.type === "text");
      return block && block.type === "text" ? block.text.trim() : "";
    } catch (err) {
      // If the live API fails (rate limit, model name change, network), fall
      // back to the deterministic stub so the demo never goes blank.
      // eslint-disable-next-line no-console
      console.error("[hermes] LLM call failed; falling back to stub:", err);
      return stubResponse(userPrompt);
    }
  }
  return stubResponse(userPrompt);
}

// Deterministic stub so the demo runs without an API key.
// Pattern-matches on the user prompt to return plausible drafts.
function stubResponse(userPrompt: string): string {
  const p = userPrompt.toLowerCase();

  if (p.includes("draft a reply") || p.includes("draft a reply to the email")) {
    if (p.includes("per-seat breakdown") || p.includes("per seat breakdown")) {
      return [
        "Hi Marisa,",
        "",
        "Thanks for following up. Here's the per-seat breakdown above 100 users:",
        "",
        "- 100–250 seats: $32/seat/mo",
        "- 251–500 seats: $28/seat/mo",
        "- 500+ seats: custom (typically $22–25/seat/mo)",
        "",
        "On BYOK: yes, supported on the Enterprise tier. I can loop in our security lead for a 20-min walkthrough this week — does Thursday afternoon work?",
        "",
        "Best,",
      ].join("\n");
    }
    if (p.includes("soc2") || p.includes("soc 2")) {
      return [
        "Hi Devon,",
        "",
        "Confirmed for 11am tomorrow.",
        "",
        "On the SOC2 Type 2: our next report drops April 15. Happy to share the bridge letter from our auditor in the meantime if it unblocks the multi-year review.",
        "",
        "Talk soon,",
      ].join("\n");
    }
    if (p.includes("hn") || p.includes("hacker news")) {
      return [
        "Hi Priya,",
        "",
        "Thanks for reaching out — and for the kind note on the post.",
        "",
        "Would love to chat. I have 30 min tomorrow at 2pm PT or Thursday at 10am PT. Either work?",
        "",
        "Best,",
      ].join("\n");
    }
    return [
      "Hi,",
      "",
      "Thanks for the note. Let me come back with details shortly.",
      "",
      "Best,",
    ].join("\n");
  }

  if (p.includes("context summary") || p.includes("three short bullets")) {
    if (p.includes("northwind") || p.includes("marisa")) {
      return [
        "- Last call surfaced pricing pushback (\">$40/seat is hard to defend\") and ramp-time concerns for non-technical users [n_1].",
        "- We promised a ramp-time write-up by today; meeting is a chance to deliver it [n_1].",
        "- Watch-outs: two skeptics on her team — engineering manager and security lead [n_2].",
      ].join("\n");
    }
    if (p.includes("orbital") || p.includes("devon")) {
      return [
        "- Renewal call. Devon wants 3 pricing tiers; multi-year discount is the lever [n_3].",
        "- Champion since pilot; SOC2 report previously requested.",
        "- Aim: leave with a verbal preference on tier + agreement on next step.",
      ].join("\n");
    }
    if (p.includes("delta pay") || p.includes("priya")) {
      return [
        "- First call. Inbound from a Hacker News post; ex-Stripe founder [n_4].",
        "- They're in early evaluation for an AI ops layer.",
        "- Goal: qualify, get them to a tailored demo within 10 days.",
      ].join("\n");
    }
    return [
      "- Internal sync. No external context to surface.",
      "- Use the time to clear blockers before the day's customer calls.",
    ].join("\n");
  }

  return "(LLM stub) Set ANTHROPIC_API_KEY for real generation.";
}
