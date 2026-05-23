"""Serve PLANIT design reference — tries PLANIT-IA then PLANIT-Design."""
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

candidates = ('../PLANIT-IA', '../PLANIT-Design')
for path in candidates:
    if os.path.isdir(path):
        os.chdir(path)
        break
else:
    print(f"Error: none of {candidates} found", file=sys.stderr)
    sys.exit(1)

port = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
print(f"Serving {os.getcwd()} on http://localhost:{port}")
with HTTPServer(('', port), SimpleHTTPRequestHandler) as httpd:
    httpd.serve_forever()
