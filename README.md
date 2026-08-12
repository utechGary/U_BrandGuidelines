# U Brand MCP

A read-only MCP server that serves United Stables ($U) brand guidelines (design tokens,
house style, voice, templates) to Claude. Teammates drop a document in Claude, run the
`apply_u_brand` prompt, and Claude restyles it on-brand using these rules.

**The server serves the brand brain; Claude (with its docx/pptx skills) does the actual output.**

## What's inside
- `content/tokens.json` — colors, type, spacing, layout, rules (edit this to change the palette)
- `content/house-style.md` — Title Case, `$U` formatting, body-copy rules
- `content/voice.md` — settlement-layer positioning, tone, pillars
- `content/templates/` — `guideline.md`, `deck.md` (structural specs Claude's skills consume)
- `lib/mcp.ts` — MCP server: 5 resources, `apply_u_brand` prompt, 3 read-only tools
- `app/api/mcp/route.ts` — Streamable HTTP endpoint at `/api/mcp`

## Run locally
```bash
npm install
npm run dev          # http://localhost:3000/api/mcp
```
`/api/mcp` speaks MCP over POST; a browser GET returns 405 — that is normal, not broken.

## Test in Claude (v0, self-host)
Claude connectors need a public HTTPS URL, so pick one:
- **Fast (tunnel):** `npx ngrok http 3000` → add `https://<ngrok>.../api/mcp` in Claude → Settings → Connectors → Add custom connector. URL changes on restart; test only.
- **Stable (deploy):** push to GitHub → import in Vercel → enable **Fluid compute** → add `https://<project>.vercel.app/api/mcp` as a custom connector.

Then: new chat → attach a doc → run the **apply_u_brand** prompt (pick `guideline` / `deck` / `doc`).

## Edit the brand
Change `content/tokens.json` or the markdown files, commit, push. No server code changes needed.

## Ownership (do NOT skip — this is why the last one died)
- Repo lives in a Git repo from day one (personal is fine for v0).
- Secrets go in env vars, never hardcoded (`.env` is gitignored; see `.env.example`).
- v0 connector added under your own Pro/Max account is fine for validation.

## Migrating to the team (Phase 4)
1. Transfer / re-import the repo into the **company GitHub org** (≥2 admins — bus factor > 1).
2. Deploy on the **company Vercel Team**, git-connected, with a custom domain
   (e.g. `brand-mcp.united-stables.com`) so the connector URL never changes again.
3. Re-enter env vars in the org project; store secrets in the company password manager.
4. **Owner adds the connector org-wide** (Organization Settings → Connectors); teammates connect.
5. Record owner / host / update steps / maintainers here.

## Maintainers
- Owner: _(fill in)_
- Host: _(personal Vercel for v0 → company Vercel Team later)_
- Last updated: _(date)_
