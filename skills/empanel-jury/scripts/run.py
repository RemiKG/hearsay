from hearsay import post_stream
import sys
story = sys.argv[1] if len(sys.argv) > 1 else "I skipped my sister's engagement dinner for a work launch."
caseId = ""
def show(v):
    print("%-14s %s (%d%%)%s: %s" % (v["lens"], v["verdict"], int(v["confidence"]*100), " MOVED" if v.get("moved") else "", v["reason"]))
for ev in post_stream("/api/trial", {"story": story, "mode": "type"}):
    if ev.get("t") == "case_opened": caseId = ev["caseId"]
    if ev.get("t") == "vote": show(ev["vote"])
    if ev.get("t") == "human_question":
        for ev2 in post_stream("/api/trial/%s/resume" % caseId, {"answer": "No"}):
            if ev2.get("t") == "vote": show(ev2["vote"])
            if ev2.get("t") == "verdict": break
        break
    if ev.get("t") == "verdict": break
