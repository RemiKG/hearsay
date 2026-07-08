// ─── comms-MCP — a real Model Context Protocol server (SSE transport) ───────
// Exposes two tools — deliver_verdict and send_invite — over the MCP SSE transport
// that Qwen's Responses API connects to ({ type: 'mcp', server_protocol: 'sse',
// server_url: 'https://.../sse' }). It reuses Hearsay's comms delivery, so Telegram
// works the moment TELEGRAM_BOT_TOKEN is set and degrades honestly otherwise.
//
// Run:  npx tsx mcp/comms-mcp/server.ts     (PORT via COMMS_MCP_PORT, default 8799)
// A hand-rolled, dependency-free MCP server: initialize → tools/list → tools/call.

import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { deliverVerdictCard, sendInvite } from '../../server/comms.js';

const PORT = Number(process.env.COMMS_MCP_PORT || 8799);
const sessions = new Map<string, http.ServerResponse>();

const TOOLS = [
  {
    name: 'deliver_verdict',
    description: "Deliver a Hearsay verdict card to a chat or inbox (Telegram / email).",
    inputSchema: {
      type: 'object',
      properties: {
        channel: { type: 'string', enum: ['telegram', 'email'] },
        to: { type: 'string', description: 'telegram chat id or email address' },
        title: { type: 'string' }, verdict: { type: 'string' }, oneLiner: { type: 'string' },
        link: { type: 'string' },
      },
      required: ['channel', 'to', 'verdict'],
    },
  },
  {
    name: 'send_invite',
    description: "Send the opt-in 'tell your side' invite link to the absent party.",
    inputSchema: {
      type: 'object',
      properties: { channel: { type: 'string', enum: ['telegram', 'email'] }, to: { type: 'string' }, link: { type: 'string' } },
      required: ['channel', 'to', 'link'],
    },
  },
];

function sendSSE(res: http.ServerResponse, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function handleRpc(msg: any): Promise<any | null> {
  const { id, method, params } = msg;
  if (method === 'initialize') {
    return { jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'hearsay-comms-mcp', version: '1.0.0' } } };
  }
  if (method === 'notifications/initialized') return null; // notification, no reply
  if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    let result;
    try {
      if (name === 'deliver_verdict') result = await deliverVerdictCard({ channel: args.channel === 'email' ? 'email' : 'telegram', to: args.to, title: args.title || 'A case', verdict: args.verdict, oneLiner: args.oneLiner || '', link: args.link });
      else if (name === 'send_invite') result = await sendInvite({ channel: args.channel === 'email' ? 'email' : 'telegram', to: args.to, link: args.link });
      else return { jsonrpc: '2.0', id, error: { code: -32601, message: `unknown tool ${name}` } };
    } catch (e: any) {
      return { jsonrpc: '2.0', id, error: { code: -32603, message: e?.message || 'tool error' } };
    }
    return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }], isError: !result.ok } };
  }
  return { jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${method}` } };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  if (req.method === 'GET' && url.pathname === '/sse') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'access-control-allow-origin': '*' });
    const sid = randomUUID();
    sessions.set(sid, res);
    // MCP SSE: the endpoint event's data is the RAW message URI (not JSON-quoted).
    res.write(`event: endpoint\ndata: /message?sessionId=${sid}\n\n`);
    const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 15000);
    req.on('close', () => { clearInterval(ping); sessions.delete(sid); });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/message') {
    const sid = url.searchParams.get('sessionId') || '';
    const sse = sessions.get(sid);
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      let msg: any; try { msg = JSON.parse(body); } catch { res.writeHead(400).end('bad json'); return; }
      const reply = await handleRpc(msg);
      res.writeHead(202, { 'access-control-allow-origin': '*' }).end('accepted');
      if (reply && sse) sendSSE(sse, 'message', reply); // MCP SSE: responses go over the SSE channel
    });
    return;
  }
  if (url.pathname === '/health') { res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true, tools: TOOLS.map((t) => t.name) })); return; }
  res.writeHead(404).end('comms-MCP: GET /sse, POST /message');
});

server.listen(PORT, () => console.log(`comms-MCP (SSE) on http://localhost:${PORT}/sse  · tools: ${TOOLS.map((t) => t.name).join(', ')}`));
