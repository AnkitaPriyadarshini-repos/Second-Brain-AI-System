import urllib.request
import json
import subprocess

p = subprocess.Popen(['git', 'credential', 'fill'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
out, _ = p.communicate(input='protocol=https\nhost=github.com\n\n')
token = None
for line in out.splitlines():
    if line.startswith('password='):
        token = line.split('password=')[1].strip()

url = 'https://api.github.com/repos/firstcontributions/first-contributions/pulls/121733/files'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Authorization': f'token {token}'})

try:
    res = urllib.request.urlopen(req)
    files = json.loads(res.read().decode('utf-8'))
    print(f"Files in PR: {len(files)}")
    for f in files:
        print(f"Filename: {f['filename']} | Additions: {f['additions']} | Deletions: {f['deletions']}")
except Exception as e:
    print('Error:', e)
