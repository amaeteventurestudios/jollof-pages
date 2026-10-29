# Speaks the video guide captions with Kokoro (kokoro-onnx). Used by narrator.ts; see README.md.
import json, os, sys

import soundfile as sf
from kokoro_onnx import Kokoro

d = os.environ["KOKORO_DIR"]
k = Kokoro(os.path.join(d, "kokoro-v1.0.onnx"), os.path.join(d, "voices-v1.0.bin"))
# reads JSON lines {"text":..., "out":...} on stdin, writes wavs, prints durations
for line in sys.stdin:
    j = json.loads(line)
    samples, sr = k.create(j["text"], voice=j.get("voice", "af_heart"), speed=j.get("speed", 1.0), lang="en-us")
    sf.write(j["out"], samples, sr)
    print(json.dumps({"out": j["out"], "seconds": len(samples) / sr}), flush=True)
