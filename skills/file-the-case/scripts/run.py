from hearsay import post_stream
import sys, json
story = sys.argv[1] if len(sys.argv) > 1 else "I skipped my sister's engagement dinner for a work launch; I gave four days' notice."
absent = sys.argv[2] if len(sys.argv) > 2 else "the other party"
for ev in post_stream("/api/trial", {"story": story, "absentName": absent, "mode": "type"}):
    if ev.get("t") == "filing":
        print(json.dumps(ev["docket"], indent=2, ensure_ascii=False))
        break
