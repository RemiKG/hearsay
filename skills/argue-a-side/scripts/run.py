from hearsay import post_stream
import sys
story = sys.argv[1] if len(sys.argv) > 1 else "I skipped my sister's engagement dinner for a work launch."
side = sys.argv[2] if len(sys.argv) > 2 else "absent"
for ev in post_stream("/api/trial", {"story": story, "mode": "type"}):
    if ev.get("t") == "argument" and ev["arg"]["side"] == side:
        tag = " (imagined best case)" if ev["arg"].get("imagined") else ""
        print(ev["arg"]["who"] + tag + ": " + ev["arg"]["text"])
        break
