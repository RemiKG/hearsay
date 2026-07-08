from hearsay import post_json
import sys
story = sys.argv[1] if len(sys.argv) > 1 else "I skipped my sister's engagement dinner for a work launch."
absent = sys.argv[2] if len(sys.argv) > 2 else "the other party"
solo = post_json("/api/solo", {"story": story, "absentName": absent, "mode": "type"})
for t in solo["tellings"]:
    print("solo agent, %s narrates -> %s  (%s)" % (t["narrator"], t["verdict"], t["quote"]))
print("solo FLIPPED:", solo["flipped"], "(a fair court would hold)")
