// ─── Qwen Cloud client (Alibaba Cloud Model Studio) ─────────────────────────
// Every model call in Hearsay's society routes through the OpenAI-compatible
// endpoint below, authenticated with a plain `sk-` DASHSCOPE_API_KEY read from the
// environment (never hardcoded/committed).
//
//   Base URL : https://dashscope-intl.aliyuncs.com/compatible-mode/v1   (Chat Completions)
//   Responses: same compatible-mode/v1 base (built-in web_search / web_extractor, MCP)
//   Docs     : https://docs.qwencloud.com  ·  env var DASHSCOPE_API_KEY

import { CONFIG } from './config.js';

export interface Msg {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<Record<string, unknown>>;
}

export interface ChatOpts {
  model: string;
  temperature?: number;
  maxTokens?: number;
  /** Qwen extra: keep chain-of-thought on (agentic) or off (to force a format/tool). */
  thinking?: boolean;
  /** ask for a JSON object back (only sent to models that support response_format). */
  json?: boolean;
  signal?: AbortSignal;
}

export interface ChatResult {
  text: string;
  tokens: number;
}

const CHAT_URL = () => `${CONFIG.dashscopeBaseUrl.replace(/\/$/, '')}/chat/completions`;
const RESPONSES_URL = () => `${CONFIG.dashscopeBaseUrl.replace(/\/$/, '')}/responses`;

// qwen3.7-max has no structured-output feature — never send it response_format.
const supportsJsonFormat = (model: string) => !/max/i.test(model);

async function postJson(url: string, body: unknown, signal?: AbortSignal): Promise<any> {
  if (!CONFIG.dashscopeApiKey) throw new Error('no-key');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONFIG.dashscopeApiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const raw = await res.text();
    let data: any;
    try { data = JSON.parse(raw); } catch { data = { _raw: raw }; }
    if (!res.ok) {
      const msg = data?.error?.message || data?.message || raw.slice(0, 300);
      throw new Error(`qwen ${res.status}: ${msg}`);
    }
    // Responses API trap: rate-limit can arrive as HTTP 200 with status:"failed".
    if (data?.status === 'failed') {
      throw new Error(`qwen responses failed: ${data?.error?.message || 'unknown'}`);
    }
    return data;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** A plain chat completion. Returns the assistant text + token usage. */
export async function chat(messages: Msg[], opts: ChatOpts): Promise<ChatResult> {
  const body: Record<string, unknown> = {
    model: opts.model,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 900,
  };
  // Qwen extras go top-level on the compatible endpoint.
  if (opts.thinking === false) body.enable_thinking = false;
  if (opts.json && supportsJsonFormat(opts.model)) body.response_format = { type: 'json_object' };
  const data = await postJson(CHAT_URL(), body, opts.signal);
  const text = data?.choices?.[0]?.message?.content ?? '';
  const tokens = data?.usage?.total_tokens ?? 0;
  return { text: typeof text === 'string' ? text : JSON.stringify(text), tokens };
}

/** Chat that returns a parsed JSON value. Robust to models that wrap JSON in prose. */
export async function chatJson<T = any>(messages: Msg[], opts: ChatOpts): Promise<{ value: T; tokens: number }> {
  const res = await chat(messages, { ...opts, json: true, temperature: opts.temperature ?? 0.4 });
  const value = extractJson<T>(res.text);
  if (value === undefined) {
    // one stricter retry
    const retry = await chat(
      [...messages, { role: 'user', content: 'Respond with ONLY valid minified JSON. No prose, no code fences.' }],
      { ...opts, json: true, temperature: 0.2 },
    );
    const v2 = extractJson<T>(retry.text);
    if (v2 === undefined) throw new Error('qwen: could not parse JSON from model');
    return { value: v2, tokens: res.tokens + retry.tokens };
  }
  return { value, tokens: res.tokens };
}

/** Read a screenshot (data: URL or https URL) into text via a vision model. */
export async function vision(imageUrl: string, prompt: string, opts?: { model?: string; signal?: AbortSignal }): Promise<ChatResult> {
  const model = opts?.model || CONFIG.models.vision;
  const messages: Msg[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageUrl } },
      ],
    },
  ];
  return chat(messages, { model, temperature: 0.3, maxTokens: 700, signal: opts?.signal });
}

/**
 * Real-world grounding through the Responses API's built-in tools. `web_extractor`
 * is free; `web_search` is billed. Returns the grounded text + the source URLs shown
 * as exhibits. Honestly returns null if grounding is off or unavailable.
 */
export async function ground(query: string, signal?: AbortSignal): Promise<{ text: string; sources: string[]; tool: string; tokens: number } | null> {
  if (CONFIG.grounding === 'off') return null;
  const tool = CONFIG.grounding === 'web_search' ? 'web_search' : 'web_extractor';
  const body: Record<string, unknown> = {
    model: CONFIG.models.cross,
    input: `Check this contested norm or fact against real sources and answer in one sentence with the finding: ${query}`,
    tools: [{ type: tool }],
    // to force a tool we disable thinking on this call
    enable_thinking: false,
  };
  try {
    const data = await postJson(RESPONSES_URL(), body, signal);
    const text = extractResponsesText(data);
    const sources = extractResponsesSources(data);
    const tokens = data?.usage?.total_tokens ?? 0;
    return { text: text || query, sources, tool, tokens };
  } catch {
    return null; // degrade honestly — the Cross-examiner falls back to "from the texts"
  }
}

// ─── parsing helpers ────────────────────────────────────────────────────────

export function extractJson<T = any>(text: string): T | undefined {
  if (!text) return undefined;
  // strip code fences
  let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(t) as T; } catch { /* fallthrough */ }
  // find the first balanced { } or [ ]
  const start = t.search(/[[{]/);
  if (start < 0) return undefined;
  const open = t[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) { const slice = t.slice(start, i + 1); try { return JSON.parse(slice) as T; } catch { return undefined; } } }
  }
  return undefined;
}

function extractResponsesText(data: any): string {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const out = data?.output;
  if (Array.isArray(out)) {
    const parts: string[] = [];
    for (const item of out) {
      const content = item?.content;
      if (Array.isArray(content)) for (const c of content) if (typeof c?.text === 'string') parts.push(c.text);
    }
    if (parts.length) return parts.join(' ').trim();
  }
  return '';
}

function extractResponsesSources(data: any): string[] {
  const urls = new Set<string>();
  const walk = (v: any) => {
    if (!v || typeof v !== 'object') return;
    if (typeof v.url === 'string' && /^https?:\/\//.test(v.url)) urls.add(v.url);
    for (const k of Object.keys(v)) walk(v[k]);
  };
  walk(data);
  return [...urls].slice(0, 3);
}
