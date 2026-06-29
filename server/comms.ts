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
