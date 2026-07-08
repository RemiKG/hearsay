from hearsay import post_stream
import sys
story = sys.argv[1] if len(sys.argv) > 1 else "I tipped 10% on slow but polite service and my date was mortified."
for ev in post_stream("/api/trial", {"story": story, "mode": "type"}):
    if ev.get("t") == "exhibit":
        e = ev["exhibit"]
        print("EXHIBIT [%s] via %s%s -- %s  (source: %s)" % (e["label"], e["tool"], " (free)" if e["free"] else "", e["detail"], e["source"]))
    if ev.get("t") == "human_question":
        print("PIVOTAL QUESTION:", ev["question"]["question"]); break
    if ev.get("t") == "verdict": break
