


# Lume Demo

A workable demo of the Hermes Morning Brief: 1-minute onboarding, two
widgets (Today's Meetings, Replies Ready) wired end-to-end against mock
data, with an editable draft loop that captures correction signals into
the WorkspaceProfile.

## Functions
A. Ask Anything — the Perplexity-for-your-company recall surface (most directly shows memory)
B. Meeting Follow-Through — memory powers the magic moment most viscerally
C. Daily Brief — morning ritual, voice-friendly
D. Personalized Outbound — fundraise/sales-mode batch action

## Run

```bash
npm install
npm run dev
# open http://localhost:3000
```

Optional: set `ANTHROPIC_API_KEY` in `.env.local` to use real Claude
drafts. Without it, the demo uses deterministic stubs so it runs offline.

## What to try

1. Open `http://localhost:3000` → onboarding.
2. Pick "SaaS startup", click "Connect Google Workspace & get started" (mocked).
3. Land on `/home` with a populated Morning Brief.
4. Click "Edit draft" on a Replies Ready item → tweak the wording → "Send & teach Hermes".
5. The correction lands in `data/workspace.json` under `corrections[]` —
   that is the signal the ProfileRefiner consumes in production.

## Reset

```bash
rm data/workspace.json
```
