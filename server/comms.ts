// ─── comms delivery (the app side of comms-MCP) ─────────────────────────────
// Deliver the shareable verdict card and the opt-in "tell your side" invite over
// Telegram / email. Behind env seams; degrades honestly (returns a clear reason)
// when a channel isn't configured. The standalone MCP server in mcp/comms-mcp wraps
// this same logic so Qwen agents can call it via the Responses API.

import { CONFIG } from './config.js';

export interface DeliverResult { ok: boolean; channel: string; detail: string }

export async function deliverTelegram(chatId: string, text: string): Promise<DeliverResult> {
  if (!CONFIG.telegramToken) return { ok: false, channel: 'telegram', detail: 'not configured — set TELEGRAM_BOT_TOKEN to enable real delivery' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${CONFIG.telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: false }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || (data as any)?.ok === false) return { ok: false, channel: 'telegram', detail: (data as any)?.description || `telegram ${res.status}` };
    return { ok: true, channel: 'telegram', detail: 'delivered' };
  } catch (e: any) {
    return { ok: false, channel: 'telegram', detail: e?.message || 'telegram error' };
  }
}

export async function deliverEmail(_to: string, _subject: string, _text: string): Promise<DeliverResult> {
  if (!CONFIG.smtpUrl) return { ok: false, channel: 'email', detail: 'not configured — set SMTP_URL + SMTP_FROM to enable real delivery' };
  // Real SMTP send is enabled by wiring a transactional provider/SMTP client here.
  // Kept as an explicit, documented seam so nothing is faked.
  return { ok: false, channel: 'email', detail: 'SMTP endpoint set but no transport is wired in — add a transactional provider/SMTP client to enable delivery' };
}

/** Deliver a verdict card over the best available channel; honest about what happened. */
export async function deliverVerdictCard(opts: { channel: 'telegram' | 'email'; to: string; title: string; verdict: string; oneLiner: string; link?: string }): Promise<DeliverResult> {
  const body =
    `⚖️ <b>Hearsay — ${escapeHtml(opts.title)}</b>\n` +
    `Verdict: <b>${escapeHtml(opts.verdict)}</b>\n` +
    `${escapeHtml(opts.oneLiner)}\n` +
    (opts.link ? `\n${opts.link}` : '');
  return opts.channel === 'telegram'
    ? deliverTelegram(opts.to, body)
    : deliverEmail(opts.to, `Hearsay verdict — ${opts.title}`, body.replace(/<[^>]+>/g, ''));
}

export async function sendInvite(opts: { channel: 'telegram' | 'email'; to: string; link: string; from?: string }): Promise<DeliverResult> {
  const body = `You've been invited to tell your side of a disagreement to Hearsay — a court that argues both sides fairly.\n\nAdd your account here: ${opts.link}`;
  return opts.channel === 'telegram' ? deliverTelegram(opts.to, body) : deliverEmail(opts.to, 'Tell your side — Hearsay', body);
}

function escapeHtml(s: string) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
