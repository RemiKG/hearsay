// ─── Server configuration & the honest engine seam ──────────────────────────
// Every external dependency is read from the environment. NOTHING is hardcoded and
// NOTHING is committed. When DASHSCOPE_API_KEY is present the whole society reasons
// on live Qwen Cloud models; when it is absent the app degrades honestly to a
// clearly-labelled deterministic demo engine (the Bench, the record, the numbers,
// and the UI all stay real).

import type { EngineInfo } from '../shared/types.js';

const env = process.env;

export const CONFIG = {
  port: Number(env.PORT || 8787),
  publicOrigin: env.PUBLIC_ORIGIN || '',

  // Qwen Cloud (Alibaba Cloud Model Studio), international/Singapore endpoint.
  dashscopeApiKey: env.DASHSCOPE_API_KEY || '',
  dashscopeBaseUrl: env.DASHSCOPE_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',

  models: {
    clerk: env.HEARSAY_MODEL_CLERK || 'qwen3.7-max',
    counsel: env.HEARSAY_MODEL_COUNSEL || 'qwen3.6-flash',
    jury: env.HEARSAY_MODEL_JURY || 'qwen3.7-plus',
    cross: env.HEARSAY_MODEL_CROSS || 'qwen3.7-plus',
    vision: env.HEARSAY_MODEL_VISION || 'qwen3-vl-plus',
    solo: env.HEARSAY_MODEL_SOLO || 'qwen3.7-max',
  } as Record<string, string>,

  grounding: (env.HEARSAY_GROUNDING || 'web_extractor') as 'web_extractor' | 'web_search' | 'off',

  telegramToken: env.TELEGRAM_BOT_TOKEN || '',
  smtpUrl: env.SMTP_URL || '',
  smtpFrom: env.SMTP_FROM || '',
};

export function isLive(): boolean {
  return !!CONFIG.dashscopeApiKey;
}

export function engineInfo(): EngineInfo {
  const live = isLive();
  return {
    live,
    provider: live ? 'qwen' : 'demo',
    baseUrl: CONFIG.dashscopeBaseUrl,
    models: CONFIG.models,
    grounding: CONFIG.grounding,
    comms: { telegram: !!CONFIG.telegramToken, email: !!CONFIG.smtpUrl },
    note: live
      ? 'Live Qwen Cloud society over your own input.'
      : 'Demo engine — no live Qwen key, so the arguments and votes are illustrative. The Bench math, the court record, the impartiality computation, and every on-screen number are real and computed.',
  };
}
