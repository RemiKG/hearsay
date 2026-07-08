from hearsay import post_stream, post_json
import sys
story = sys.argv[1] if len(sys.argv) > 1 else "I skipped my sister's engagement dinner for a work launch."
channel = sys.argv[2] if len(sys.argv) > 2 else "telegram"
to = sys.argv[3] if len(sys.argv) > 3 else ""
verdict = None; caseId = ""
for ev in post_stream("/api/trial", {"story": story, "mode": "type"}):
    if ev.get("t") == "case_opened": caseId = ev["caseId"]
    if ev.get("t") == "human_question":
        for ev2 in post_stream("/api/trial/%s/resume" % caseId, {"answer": "No"}):
            if ev2.get("t") == "verdict": verdict = ev2["verdict"]
        break
    if ev.get("t") == "verdict": verdict = ev["verdict"]; break
if verdict:
    print("VERDICT:", verdict["category"], verdict["split"], "--", verdict["oneLiner"])
    if to:
        r = post_json("/api/comms/verdict", {"channel": channel, "to": to, "title": "A case",
              "verdict": verdict["category"] + " . " + verdict["split"], "oneLiner": verdict["oneLiner"]})
        print("delivery:", r)
