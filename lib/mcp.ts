import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import tokens from "../content/tokens.json";
import logos from "../content/logos.json";
import fonts from "../content/fonts.json";

// ----- content loading -------------------------------------------------------
// tokens.json is imported (bundled automatically). Markdown is read from disk;
// content/** is included in the serverless bundle via next.config.js
// (outputFileTracingIncludes). Edit the files in /content — never hardcode here.
const CONTENT = join(process.cwd(), "content");
const read = (p: string) => readFileSync(join(CONTENT, p), "utf8");

const houseStyle = read("house-style.md");
const voice = read("voice.md");
const templates: Record<string, string> = {
  guideline: read("templates/guideline.md"),
  deck: read("templates/deck.md"),
};

// ----- logo asset URLs -------------------------------------------------------
// Logo files live in /public/logos and are served by Vercel at <BASE>/logos/*.
// BASE auto-resolves to the production domain; override with PUBLIC_BASE_URL
// when you move to a custom domain.
const BASE =
  process.env.PUBLIC_BASE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://u-brand-guidelines.vercel.app");
const logoUrl = (file: string) => `${BASE}/logos/${file}`;
type LogoVariant = { role: string; file?: string; black?: string; white?: string };
const resolvedLogos = {
  usage: logos.usage,
  selectByBackground: logos.selectByBackground,
  variants: Object.fromEntries(
    Object.entries(logos.variants as Record<string, LogoVariant>).map(([k, v]) => {
      const out: Record<string, string> = { role: v.role };
      if (v.file) out.url = logoUrl(v.file);
      if (v.black) out.blackUrl = logoUrl(v.black);
      if (v.white) out.whiteUrl = logoUrl(v.white);
      return [k, out];
    })
  ) as Record<string, { role: string; url?: string; blackUrl?: string; whiteUrl?: string }>,
};

// ----- font asset URLs -------------------------------------------------------
const fontUrl = (file: string) => `${BASE}/fonts/${file}`;
const resolvedFonts = {
  family: fonts.family,
  role: fonts.role,
  license: fonts.license,
  note: fonts.note,
  weights: fonts.weights.map((w) => ({ ...w, url: fontUrl(w.file) })),
};

// ----- house-style checker (heuristic, mirrors house-style.md) ---------------
const MINOR = new Set([
  "a", "an", "the",
  "at", "by", "for", "in", "on", "to", "up", "with", "as", "of", "off", "out", "via",
  "and", "but", "if", "or", "nor", "yet", "so",
]);
// Preserve-exactly tokens (brand names / acronyms). Matched case-insensitively;
// if the source already matches one of these, we never flag its casing.
const PRESERVE = new Set(
  [
    "$U", "United Stables", "Binance", "Binance Wallet", "Bitget", "BNB Chain",
    "Ceffu", "Mirror X", "OpenEden", "Aster", "Aster DEX", "Lista DAO", "ListaDAO",
    "BSC", "KuCoin", "LBank", "AI", "CEX", "DEX", "APR", "LP", "RWA",
  ].map((s) => s.toLowerCase())
);

function checkTitle(title: string) {
  const findings: string[] = [];
  const trimmed = title.trim();

  // Rule 2 — trailing punctuation
  if (/[.,;]$/.test(trimmed)) {
    findings.push(`Trailing punctuation "${trimmed.slice(-1)}" — strip it (Rule 2).`);
  }

  // Rule 1 — title case
  const words = trimmed.replace(/[.,;]$/, "").split(/\s+/);
  words.forEach((w, i) => {
    const bare = w.replace(/[^A-Za-z$]/g, "");
    if (!bare) return;
    if (PRESERVE.has(w.toLowerCase()) || /\d/.test(w) || w === w.toUpperCase()) return; // brand / acronym / number
    const isEdge = i === 0 || i === words.length - 1;
    const lower = bare.toLowerCase();
    const startsUpper = /^[A-Z]/.test(bare);
    if (!isEdge && MINOR.has(lower) && startsUpper) {
      findings.push(`"${w}" is a minor word mid-title — lowercase it (Rule 1).`);
    }
    if (!MINOR.has(lower) && !startsUpper) {
      findings.push(`"${w}" is a major word — capitalize it (Rule 1).`);
    }
    if (isEdge && !startsUpper && !PRESERVE.has(lower)) {
      findings.push(`"${w}" is first/last word — always capitalize (Rule 1).`);
    }
  });

  return findings;
}

// ----- MCP handler -----------------------------------------------------------
export const handler = createMcpHandler(
  (server) => {
    // Resources — the brand system, readable by the client
    server.registerResource(
      "tokens", "brand://tokens",
      { title: "U Brand Design Tokens", description: "Colors, type, spacing, layout, rules", mimeType: "application/json" },
      async (uri) => ({ contents: [{ uri: uri.href, text: JSON.stringify(tokens, null, 2) }] })
    );
    server.registerResource(
      "house-style", "brand://house-style",
      { title: "U House Style", description: "Title case, $U formatting, body copy rules", mimeType: "text/markdown" },
      async (uri) => ({ contents: [{ uri: uri.href, text: houseStyle }] })
    );
    server.registerResource(
      "voice", "brand://voice",
      { title: "U Voice & Positioning", description: "Settlement-layer positioning, tone, pillars", mimeType: "text/markdown" },
      async (uri) => ({ contents: [{ uri: uri.href, text: voice }] })
    );
    server.registerResource(
      "template-guideline", "brand://template/guideline",
      { title: "Template — Brand Guideline layout", mimeType: "text/markdown" },
      async (uri) => ({ contents: [{ uri: uri.href, text: templates.guideline }] })
    );
    server.registerResource(
      "template-deck", "brand://template/deck",
      { title: "Template — On-brand deck (pptx)", mimeType: "text/markdown" },
      async (uri) => ({ contents: [{ uri: uri.href, text: templates.deck }] })
    );
    server.registerResource(
      "logos", "brand://logos",
      { title: "U Logo Colorways & Imagery", description: "Logo colorway URLs, usage, and never-recolour rule", mimeType: "application/json" },
      async (uri) => ({ contents: [{ uri: uri.href, text: JSON.stringify(resolvedLogos, null, 2) }] })
    );
    server.registerResource(
      "fonts", "brand://fonts",
      { title: "U Fonts (General Sans)", description: "Font family, license, and download URLs per weight", mimeType: "application/json" },
      async (uri) => ({ contents: [{ uri: uri.href, text: JSON.stringify(resolvedFonts, null, 2) }] })
    );

    // Prompt — the one-tap entry point for non-technical teammates
    server.registerPrompt(
      "apply_u_brand",
      {
        title: "Apply U Brand",
        description: "Restyle the attached document into United Stables ($U) brand — voice, house style, and visual tokens.",
        argsSchema: z.object({
          output_type: z.enum(["guideline", "deck", "doc"]).describe("What to produce"),
        }),
      },
      ({ output_type }) => ({
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text:
                `Restyle the attached document into United Stables ($U) brand as a ${output_type}.\n\n` +
                `Steps:\n` +
                `1. Read resources brand://voice, brand://house-style, brand://tokens, and brand://template/${output_type === "deck" ? "deck" : "guideline"}.\n` +
                `2. Copy: SELECT / FILTER / ARRANGE the source — do not creatively rewrite unless asked.\n` +
                `3. Titles → Title Case, no trailing punctuation. Body → sentence case. Preserve brand names exactly. Amount format \`100,000 $U\`.\n` +
                `4. Apply visual tokens; keep positioning as unified liquidity layer / infrastructure (not a coin). AI-Ready sections take the dark treatment.\n` +
                `5. Logos: before placing any logo, call get_logo with the slide/section background (light or dark) and use the recommended file — WHITE on dark, BLACK on light. Primary is the default lockup; Token for the coin visual.\n` +
                `6. For a deck, use your pptx skill to produce a real file; state image backgrounds explicitly (cream-white).`,
            },
          },
        ],
      })
    );

    // Read-only tools
    server.registerTool(
      "get_brand_tokens",
      { title: "Get Brand Tokens", description: "Return the U design tokens as JSON", inputSchema: z.object({}), annotations: { readOnlyHint: true } },
      async () => ({ content: [{ type: "text", text: JSON.stringify(tokens) }] })
    );
    server.registerTool(
      "get_template",
      { title: "Get Template", description: "Return a brand template spec", inputSchema: z.object({ type: z.enum(["guideline", "deck"]) }), annotations: { readOnlyHint: true } },
      async ({ type }) => ({ content: [{ type: "text", text: templates[type] }] })
    );
    server.registerTool(
      "get_logo",
      {
        title: "Get Logo",
        description: "Return U logo URLs + usage rules. Optionally pick a variant and/or a background to get the recommended file.",
        inputSchema: z.object({
          variant: z.enum(["primary", "stacked", "logomark", "token"]).optional(),
          background: z.enum(["light", "dark"]).optional(),
        }),
        annotations: { readOnlyHint: true },
      },
      async ({ variant, background }) => {
        const pick = (v: { role: string; url?: string; blackUrl?: string; whiteUrl?: string }) => {
          if (v.url) return { role: v.role, url: v.url }; // single-file (logomark, token)
          if (background) return { role: v.role, recommended: background === "dark" ? v.whiteUrl : v.blackUrl, blackUrl: v.blackUrl, whiteUrl: v.whiteUrl };
          return { role: v.role, blackUrl: v.blackUrl, whiteUrl: v.whiteUrl };
        };
        const entries = variant ? [[variant, resolvedLogos.variants[variant]] as const] : Object.entries(resolvedLogos.variants);
        const out = Object.fromEntries(entries.map(([k, v]) => [k, pick(v)]));
        return { content: [{ type: "text", text: JSON.stringify({ usage: resolvedLogos.usage, selectByBackground: resolvedLogos.selectByBackground, variants: out }, null, 2) }] };
      }
    );
    server.registerTool(
      "get_font",
      {
        title: "Get Font",
        description: "Return General Sans (document face) download URLs + license. Optionally filter by weight/style.",
        inputSchema: z.object({
          weight: z.enum(["extralight", "light", "regular", "medium", "semibold", "bold"]).optional(),
          style: z.enum(["normal", "italic"]).optional(),
        }),
        annotations: { readOnlyHint: true },
      },
      async ({ weight, style }) => {
        const weightMap: Record<string, number> = { extralight: 200, light: 300, regular: 400, medium: 500, semibold: 600, bold: 700 };
        let list = resolvedFonts.weights;
        if (weight) list = list.filter((w) => w.weight === weightMap[weight]);
        if (style) list = list.filter((w) => w.style === style);
        return { content: [{ type: "text", text: JSON.stringify({ family: resolvedFonts.family, role: resolvedFonts.role, license: resolvedFonts.license, note: resolvedFonts.note, weights: list }, null, 2) }] };
      }
    );
    server.registerTool(
      "check_house_style",
      { title: "Check House Style", description: "Heuristic title-case + trailing-punctuation check for one title", inputSchema: z.object({ title: z.string() }), annotations: { readOnlyHint: true } },
      async ({ title }) => {
        const findings = checkTitle(title);
        return { content: [{ type: "text", text: findings.length ? findings.join("\n") : "No title-case or trailing-punctuation issues found (heuristic)." }] };
      }
    );
  },
  { serverInfo: { name: "u-brand-mcp", version: "0.1.0" } }
);
