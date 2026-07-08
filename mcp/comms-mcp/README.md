# comms-MCP

A real [Model Context Protocol](https://modelcontextprotocol.io) server (SSE transport) that
delivers Hearsay's shareable **verdict card** and the opt-in **"tell your side" invite** over
Telegram / email. It is the *named rubric* MCP surface, and it is what turns the empty chair into
an optionally-real second voice.

## Tools
- `deliver_verdict(channel, to, title, verdict, oneLiner, link?)`
- `send_invite(channel, to, link)`

Delivery reuses `server/comms.ts`, so Telegram works the moment `TELEGRAM_BOT_TOKEN` is set and
**degrades honestly** (returns a clear "not configured" reason) otherwise — nothing is faked.

## Run
```bash
npm run mcp            # COMMS_MCP_PORT (default 8799)
```

## Connect from Qwen (Responses API)
```json
{
  "type": "mcp",
  "server_protocol": "sse",
  "server_label": "hearsay-comms",
  "server_url": "https://<host>:8799/sse"
}
```
The Clerk chains this tool at the end of the proceeding to deliver the finished card. MCP is
Responses-API + SSE only (≤10 servers/request) — Hearsay uses one.
