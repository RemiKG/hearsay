# Hearsay skills — shared client (stdlib only)
import os, json, urllib.request
BASE = os.environ.get("HEARSAY_BASE", "http://localhost:8787")

def post_stream(pathname, body):
    """POST and yield each streamed CourtEvent (SSE-over-POST)."""
    req = urllib.request.Request(BASE + pathname, data=json.dumps(body).encode(),
                                 headers={"content-type": "application/json"})
    buf = ""
    with urllib.request.urlopen(req) as r:
        for chunk in r:
            buf += chunk.decode("utf-8", "ignore")
            while "\n\n" in buf:
                frame, buf = buf.split("\n\n", 1)
                for line in frame.split("\n"):
                    if line.startswith("data:"):
                        try:
                            yield json.loads(line[5:].strip())
                        except Exception:
                            pass

def post_json(pathname, body):
    req = urllib.request.Request(BASE + pathname, data=json.dumps(body).encode(),
                                 headers={"content-type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())
